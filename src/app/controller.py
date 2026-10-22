"""
Controlador de Sessão (CTRL) — orquestra UI <-> WM <-> ENGINE <-> DB.

Fluxo de uma resposta::

    UI ──AnswerRequest──> CTRL ──valida──> PR
                           │
                           ├──grava histórico──> DB   (auditoria primeiro)
                           ├──insere fato──────> WM
                           ├──ciclo de inferência──> ENGINE (lê fatos da WM, regras da KB)
                           └──snapshot do diagnóstico──> DB
                           │
    UI <──AnswerResponse───┘

O controlador não contém conhecimento clínico nem fórmulas: apenas coordena as
camadas e converte os resultados do motor em DTOs.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Dict, List, Mapping, Optional, Tuple

from src.app.errors import SessaoNaoEncontrada
from src.app.schemas import (
    AnswerRequest,
    AnswerResponse,
    CamadaStatusDTO,
    ComponenteUtilidadeDTO,
    EvidenciaDTO,
    EvidenciaSemEfeitoDTO,
    HipoteseDTO,
    NextQuestionResponse,
    OpcaoDTO,
    PerguntaDTO,
    ProgressoDTO,
    RankingResponse,
    RespostaRegistradaDTO,
    SessionStartResponse,
)
from src.app.validators import InputValidator
from src.db import STATUS_CONCLUIDA, STATUS_EM_ANDAMENTO, Database, SessaoRepository
from src.engine import AvaliacaoDoenca, DecisaoParada, InferenceEngine, SelecaoPergunta
from src.kb import KnowledgeBase
from src.wm import WorkingMemory, WorkingMemoryStore

_CASAS = 4  # casas decimais expostas na API

MOTIVO_SEM_PERGUNTAS = "Não há mais perguntas capazes de alterar o diagnóstico."


def _r(valor: float) -> float:
    return round(float(valor), _CASAS)


@dataclass(frozen=True)
class _EstadoInferencia:
    """Resultado consolidado de um ciclo de inferência sobre a WM."""

    ranking: List[AvaliacaoDoenca]
    parada: DecisaoParada
    proxima: Optional[SelecaoPergunta]
    total_respostas: int

    @property
    def concluida(self) -> bool:
        return self.parada.parar or self.proxima is None

    @property
    def motivo(self) -> Optional[str]:
        if self.parada.parar:
            return self.parada.motivo
        if self.proxima is None:
            return MOTIVO_SEM_PERGUNTAS
        return None


class SessionController:
    """Ciclo de vida das sessões de anamnese."""

    def __init__(self, kb: KnowledgeBase, engine: InferenceEngine, wm_store: WorkingMemoryStore,
                 db: Database, repositorio: SessaoRepository, validador: InputValidator):
        self._kb = kb
        self._engine = engine
        self._wm_store = wm_store
        self._db = db
        self._repo = repositorio
        self._validador = validador

    # ================================================================ casos de uso
    def iniciar_sessao(self) -> SessionStartResponse:
        """RF01 — cria a sessão no SQLite e uma Memória de Trabalho vazia."""
        session_id = str(uuid.uuid4())
        registro = self._repo.criar_sessao(session_id)
        self._wm_store.criar(session_id)
        return SessionStartResponse(
            session_id=session_id,
            status=STATUS_EM_ANDAMENTO,
            data_inicio=registro.data_inicio,
            kb_nome=self._kb.nome,
            kb_versao=self._kb.versao,
            escala_respostas=self._escala(),
            total_parametros=len(self._kb.parametros),
            aviso=self._kb.aviso,
        )

    def proxima_pergunta(self, session_id: str) -> NextQuestionResponse:
        """Pergunta de maior utilidade, ou sinalização de conclusão."""
        session_id, wm = self._obter_wm(session_id)
        estado = self._inferir(wm.respostas())
        pergunta = None
        if not estado.concluida and estado.proxima is not None:
            pergunta = self._pergunta_dto(estado.proxima)
        return NextQuestionResponse(
            session_id=session_id,
            concluida=estado.concluida,
            motivo=estado.motivo,
            pergunta=pergunta,
            progresso=self._progresso(wm.respostas()),
        )

    def responder(self, session_id: str, req: AnswerRequest) -> AnswerResponse:
        """RF02–RF05/RF08 — registra a evidência e recalcula o diagnóstico."""
        session_id, wm = self._obter_wm(session_id)
        resposta = self._validador.validar_resposta(req)
        substituiu = wm.respondido(resposta.parametro)

        # Registra no repositório de histórico na memória RAM e atualiza a Memória de Trabalho (WM)
        self._repo.registrar_resposta(session_id, resposta.parametro, resposta.cf)
        wm.registrar_resposta(resposta.parametro, resposta.cf, resposta.opcao)

        estado = self._inferir(wm.respostas())
        diagnostico = self._ranking_dto(session_id, estado)
        self._repo.atualizar_diagnostico(
            session_id, diagnostico.model_dump(mode="json"), status=diagnostico.status
        )
        return AnswerResponse(
            session_id=session_id,
            registrada=RespostaRegistradaDTO(
                parametro=resposta.parametro,
                opcao=resposta.opcao,
                cf_evidencia=_r(resposta.cf),
                substituiu_resposta_anterior=substituiu,
            ),
            diagnostico=diagnostico,
        )

    def ranking(self, session_id: str) -> RankingResponse:
        """RF09/RF10 — hipóteses ranqueadas com classificação e traço explicativo."""
        session_id, wm = self._obter_wm(session_id)
        return self._ranking_dto(session_id, self._inferir(wm.respostas()))

    # ================================================================ saúde
    def verificar_saude(self) -> Tuple[bool, Dict[str, CamadaStatusDTO]]:
        """Verifica as camadas 2 a 5 (a UI acrescenta a própria camada)."""
        camadas: Dict[str, CamadaStatusDTO] = {}

        camadas["camada_2_app"] = CamadaStatusDTO(
            pacote="src/app", descricao="Aplicação, Validação (PR) e Controlador de Sessão (CTRL)",
            status="ok", detalhes={"controlador": type(self).__name__},
        )

        try:
            estado = self._inferir({})
            camadas["camada_3_engine"] = CamadaStatusDTO(
                pacote="src/engine", descricao="Motor de Inferência (MYCIN + utilidade)", status="ok",
                detalhes={"hipoteses_avaliadas": len(estado.ranking),
                          "primeira_pergunta": estado.proxima.parametro.id if estado.proxima else None},
            )
        except Exception as exc:  # pragma: no cover - defensivo
            camadas["camada_3_engine"] = CamadaStatusDTO(
                pacote="src/engine", descricao="Motor de Inferência", status="erro",
                detalhes={"erro": str(exc)},
            )

        camadas["camada_4_wm"] = CamadaStatusDTO(
            pacote="src/wm", descricao="Memória de Trabalho (RAM, isolada por sessão)", status="ok",
            detalhes={"sessoes_ativas": self._wm_store.total()},
        )

        camadas["camada_5a_kb"] = CamadaStatusDTO(
            pacote="src/kb", descricao="Base de Conhecimento declarativa (JSON)", status="ok",
            detalhes={"versao": self._kb.versao, "doencas": len(self._kb.doencas),
                      "parametros": len(self._kb.parametros), "criterios": len(self._kb.criterios)},
        )

        camadas["camada_5b_db"] = CamadaStatusDTO(
            pacote="src/db", descricao="Armazenamento 100% em Memória RAM (In-Memory)",
            status="ok",
            detalhes={"tipo": "In-Memory RAM", "persistente_disco": False},
        )

        saudavel = all(c.status == "ok" for c in camadas.values())
        return saudavel, camadas

    # ================================================================ internos
    def _obter_wm(self, session_id: str) -> Tuple[str, WorkingMemory]:
        """Retorna a WM da sessão ativa em memória RAM."""
        session_id = self._validador.validar_session_id(session_id)
        wm = self._wm_store.obter(session_id)
        if wm is not None:
            return session_id, wm

        # Se não existe na WM e nem no repositório de sessões em memória
        if self._repo.obter_sessao(session_id) is None:
            raise SessaoNaoEncontrada(f"sessão não encontrada: {session_id}")

        try:
            wm = self._wm_store.criar(session_id)
        except KeyError:
            wm = self._wm_store.obter(session_id)
            assert wm is not None
            return session_id, wm

        for registro in self._repo.listar_respostas(session_id):
            if self._kb.parametro(registro.parametro) is not None:
                wm.registrar_resposta(registro.parametro, registro.valor_cf)
        return session_id, wm

    def _inferir(self, respostas: Mapping[str, float]) -> _EstadoInferencia:
        ranking = self._engine.ranking(respostas)
        return _EstadoInferencia(
            ranking=ranking,
            parada=self._engine.deve_parar(ranking, len(respostas)),
            proxima=self._engine.selecionar_proxima_pergunta(respostas),
            total_respostas=len(respostas),
        )

    # ---------------------------------------------------------------- DTOs
    def _escala(self) -> List[OpcaoDTO]:
        return [OpcaoDTO(codigo=o.codigo, rotulo=o.rotulo, cf=o.cf) for o in self._kb.escala_respostas]

    def _progresso(self, respostas: Mapping[str, float]) -> ProgressoDTO:
        total = len(self._kb.parametros)
        pendentes = self._engine.perguntas_pendentes(respostas)
        return ProgressoDTO(respondidas=total - pendentes, total_parametros=total, pendentes=pendentes)

    def _pergunta_dto(self, selecao: SelecaoPergunta) -> PerguntaDTO:
        p = selecao.parametro
        return PerguntaDTO(
            parametro=p.id,
            texto=p.texto,
            ajuda=p.ajuda,
            categoria=p.categoria,
            opcoes=self._escala(),
            utilidade=_r(selecao.utilidade),
            justificativa=[
                ComponenteUtilidadeDTO(
                    doenca_id=c.doenca_id, doenca_nome=c.doenca_nome, cf_criterio=_r(c.cf_criterio),
                    cf_atual=_r(c.cf_atual), urgencia=_r(c.urgencia), contribuicao=_r(c.valor),
                )
                for c in sorted(selecao.componentes, key=lambda c: -c.valor)
            ],
        )

    @staticmethod
    def _hipotese_dto(posicao: int, a: AvaliacaoDoenca) -> HipoteseDTO:
        d = a.doenca
        return HipoteseDTO(
            posicao=posicao,
            doenca_id=d.id,
            nome=d.nome,
            pilar=d.pilar,
            sistema=d.sistema,
            cf=_r(a.cf),
            cf_percentual=round(a.cf * 100, 1),
            prior=_r(d.prior),
            urgencia=_r(d.urgencia),
            classificacao=a.classificacao.rotulo,
            nivel=a.classificacao.nivel,
            recomendacao=a.classificacao.recomendacao,
            conduta=d.conduta,
            explicacao=[
                EvidenciaDTO(
                    parametro=p.parametro, pergunta=p.pergunta, cf_resposta=_r(p.cf_resposta),
                    cf_criterio=_r(p.cf_criterio), contribuicao=_r(p.contribuicao),
                    cf_antes=_r(p.cf_antes), cf_depois=_r(p.cf_depois), efeito=p.efeito,
                    justificativa=p.justificativa,
                )
                for p in a.passos
            ],
            evidencias_sem_efeito=[
                EvidenciaSemEfeitoDTO(
                    parametro=e.parametro, pergunta=e.pergunta,
                    cf_resposta=_r(e.cf_resposta), cf_criterio=_r(e.cf_criterio),
                )
                for e in a.sem_efeito
            ],
        )

    def _ranking_dto(self, session_id: str, estado: _EstadoInferencia) -> RankingResponse:
        hipoteses = [self._hipotese_dto(i, a) for i, a in enumerate(estado.ranking, start=1)]
        return RankingResponse(
            session_id=session_id,
            status=STATUS_CONCLUIDA if estado.concluida else STATUS_EM_ANDAMENTO,
            total_respostas=estado.total_respostas,
            criterio_parada_atingido=estado.parada.parar,
            motivo_conclusao=estado.motivo,
            hipotese_principal=hipoteses[0] if hipoteses else None,
            ranking=hipoteses,
            kb_versao=self._kb.versao,
            aviso=self._kb.aviso,
        )
