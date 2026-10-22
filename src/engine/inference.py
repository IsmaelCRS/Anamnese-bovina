"""
Motor de Inferência determinístico (Camada 3).

Porta orientada a objetos das funções/regra CLIPS do ``codigo_exemplo_base.md``:

==============================  =============================================
CLIPS (codigo_exemplo_base)     Python (este módulo)
==============================  =============================================
``combinar-cf``                 :func:`src.engine.certainty.combinar_cf`
``cf-doenca``                   :meth:`InferenceEngine.cf_doenca`
``urgencia-doenca``             ``Doenca.urgencia`` (KB)
``utilidade``                   :meth:`InferenceEngine.utilidade`
``escolher-proxima-pergunta``   :meth:`InferenceEngine.selecionar_proxima_pergunta`
``ranking`` / ``classificar``   :meth:`InferenceEngine.ranking` / :meth:`classificar`
``deve-parar``                  :meth:`InferenceEngine.deve_parar`
``explicar``                    ``AvaliacaoDoenca.passos`` (traço "Como?")
==============================  =============================================

Ciclo Match-Resolve-Act aplicado ao cálculo do CF de cada doença:

* **Match**   – casa cada ``criterio`` da doença com a ``resposta`` do mesmo
  parâmetro presente na Memória de Trabalho (somente evidência positiva, CF > 0,
  exatamente como em ``cf-doenca``).
* **Resolve** – ordena as ativações pela ordem declarada na KB (determinística).
* **Act**     – acumula ``CF_regra x CF_evidência`` sobre o prior via MYCIN e
  registra cada disparo no traço de explicação.

O motor é **puro**: não acessa disco, rede, relógio ou aleatoriedade. Dadas a
mesma KB e as mesmas respostas, o resultado é sempre idêntico.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Mapping, Optional, Tuple

from src.engine.certainty import combinar_cf
from src.kb.models import Criterio, Doenca, FaixaClassificacao, KnowledgeBase, Parametro

#: Respostas da sessão: id do parâmetro -> CF da evidência (1.0, 0.6, 0.0, -1.0...).
Respostas = Mapping[str, float]


# ---------------------------------------------------------------------------
# Estruturas de resultado (imutáveis)
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class PassoInferencia:
    """Um disparo de critério que alterou o CF da doença (traço "Como?")."""

    parametro: str
    pergunta: str
    cf_resposta: float
    cf_criterio: float
    contribuicao: float
    cf_antes: float
    cf_depois: float
    justificativa: str

    @property
    def efeito(self) -> str:
        return "reforca" if self.contribuicao > 0 else "enfraquece"


@dataclass(frozen=True)
class EvidenciaSemEfeito:
    """Critério respondido que NÃO alterou o CF (resposta "não" ou "não sei").

    No modelo base (``cf-doenca``) apenas respostas com CF > 0 participam da
    combinação; listá-las torna a ausência de efeito auditável.
    """

    parametro: str
    pergunta: str
    cf_resposta: float
    cf_criterio: float


@dataclass(frozen=True)
class AvaliacaoDoenca:
    """CF atual de uma doença com seu traço de explicação completo."""

    doenca: Doenca
    cf: float
    classificacao: FaixaClassificacao
    passos: Tuple[PassoInferencia, ...]
    sem_efeito: Tuple[EvidenciaSemEfeito, ...]


@dataclass(frozen=True)
class ComponenteUtilidade:
    """Parcela da utilidade de uma pergunta atribuída a uma doença (traço "Por quê?")."""

    doenca_id: str
    doenca_nome: str
    cf_criterio: float
    cf_atual: float
    urgencia: float
    valor: float


@dataclass(frozen=True)
class SelecaoPergunta:
    """Pergunta escolhida pela heurística de utilidade."""

    parametro: Parametro
    utilidade: float
    componentes: Tuple[ComponenteUtilidade, ...]


@dataclass(frozen=True)
class DecisaoParada:
    """Resultado do critério de parada do diálogo."""

    parar: bool
    motivo: str


# ---------------------------------------------------------------------------
# Motor
# ---------------------------------------------------------------------------
class InferenceEngine:
    """Motor de inferência MYCIN + seleção de perguntas por utilidade.

    Todo o conhecimento clínico vem da :class:`KnowledgeBase` injetada; nenhuma
    doença, parâmetro ou peso é codificado aqui.
    """

    def __init__(self, kb: KnowledgeBase):
        self._kb = kb
        # Posição de cada doença na KB: usada como desempate determinístico.
        self._ordem_doenca: Dict[str, int] = {d.id: i for i, d in enumerate(kb.doencas)}

    @property
    def kb(self) -> KnowledgeBase:
        return self._kb

    # ------------------------------------------------------------ cf-doenca
    def _match(self, doenca_id: str, respostas: Respostas) -> List[Tuple[Criterio, float]]:
        """Match + Resolve: critérios da doença cujo parâmetro já foi respondido."""
        return [
            (c, float(respostas[c.parametro]))
            for c in self._kb.criterios_da_doenca(doenca_id)  # ordem da KB
            if c.parametro in respostas
        ]

    def avaliar_doenca(self, doenca_id: str, respostas: Respostas) -> AvaliacaoDoenca:
        """Calcula o CF da doença e gera o traço de explicação (Act)."""
        doenca = self._kb.doenca(doenca_id)
        if doenca is None:
            raise KeyError(f"doença desconhecida: {doenca_id}")

        cf = doenca.prior
        passos: List[PassoInferencia] = []
        sem_efeito: List[EvidenciaSemEfeito] = []

        for criterio, cf_resposta in self._match(doenca_id, respostas):
            pergunta = self._texto_parametro(criterio.parametro)
            if cf_resposta > 0:
                contribuicao = criterio.cf * cf_resposta
                novo = combinar_cf(cf, contribuicao)
                passos.append(PassoInferencia(
                    parametro=criterio.parametro,
                    pergunta=pergunta,
                    cf_resposta=cf_resposta,
                    cf_criterio=criterio.cf,
                    contribuicao=contribuicao,
                    cf_antes=cf,
                    cf_depois=novo,
                    justificativa=criterio.justificativa,
                ))
                cf = novo
            else:
                sem_efeito.append(EvidenciaSemEfeito(
                    parametro=criterio.parametro,
                    pergunta=pergunta,
                    cf_resposta=cf_resposta,
                    cf_criterio=criterio.cf,
                ))

        return AvaliacaoDoenca(
            doenca=doenca,
            cf=cf,
            classificacao=self.classificar(cf),
            passos=tuple(passos),
            sem_efeito=tuple(sem_efeito),
        )

    def cf_doenca(self, doenca_id: str, respostas: Respostas) -> float:
        """Equivalente direto de ``(cf-doenca ?nome)``."""
        return self.avaliar_doenca(doenca_id, respostas).cf

    # ------------------------------------------------------------ ranking
    def ranking(self, respostas: Respostas) -> List[AvaliacaoDoenca]:
        """Doenças ordenadas por CF decrescente.

        Desempate determinístico: maior urgência primeiro, depois a ordem de
        declaração na KB.
        """
        avaliacoes = [self.avaliar_doenca(d.id, respostas) for d in self._kb.doencas]
        avaliacoes.sort(key=lambda a: (-a.cf, -a.doenca.urgencia, self._ordem_doenca[a.doenca.id]))
        return avaliacoes

    def classificar(self, cf: float) -> FaixaClassificacao:
        """Traduz o CF em linguagem clínica usando as faixas declaradas na KB."""
        for faixa in self._kb.classificacao:  # já ordenadas da maior para a menor
            if cf >= faixa.cf_minimo:
                return faixa
        return self._kb.classificacao[-1]

    # ------------------------------------------------------------ utilidade
    def utilidade(self, parametro_id: str, respostas: Respostas,
                  cfs_atuais: Optional[Mapping[str, float]] = None) -> SelecaoPergunta:
        """Utilidade de perguntar ``parametro_id`` (``deffunction utilidade``).

        Para cada critério ligado ao parâmetro::

            |CF da regra| x (1 - |CF atual|) x urgência x (1 + CF atual) / 2

        * ``|CF da regra|``    – quanto a resposta pode mover a doença;
        * ``(1 - |CF atual|)`` – ainda há espaço para mover (não está decidida);
        * ``urgência``         – doenças graves ganham prioridade;
        * ``(1 + CF atual)/2`` – doenças já refutadas pesam menos.
        """
        parametro = self._kb.parametro(parametro_id)
        if parametro is None:
            raise KeyError(f"parâmetro desconhecido: {parametro_id}")
        if cfs_atuais is None:
            cfs_atuais = self._cfs_atuais(respostas)

        componentes = []
        total = 0.0
        for c in self._kb.criterios_do_parametro(parametro_id):
            doenca = self._kb.doenca(c.doenca)
            assert doenca is not None  # garantido pela validação da KB
            atual = cfs_atuais[c.doenca]
            valor = abs(c.cf) * (1 - abs(atual)) * doenca.urgencia * ((1 + atual) / 2)
            total += valor
            componentes.append(ComponenteUtilidade(
                doenca_id=doenca.id,
                doenca_nome=doenca.nome,
                cf_criterio=c.cf,
                cf_atual=atual,
                urgencia=doenca.urgencia,
                valor=valor,
            ))
        return SelecaoPergunta(parametro=parametro, utilidade=total, componentes=tuple(componentes))

    def selecionar_proxima_pergunta(self, respostas: Respostas) -> Optional[SelecaoPergunta]:
        """Regra ``escolher-proxima-pergunta``.

        Entre os parâmetros ainda sem resposta, escolhe o de maior utilidade
        (estritamente > 0). Em empate vence o primeiro declarado na KB, o que
        garante determinismo. Se não houver perguntas com utilidade > 0, mas
        o número de respostas ainda for inferior a ``min_respostas``, continua
        perguntando os parâmetros pendentes na ordem da KB. Retorna ``None``
        apenas quando não há parâmetros pendentes ou quando min_respostas já
        foi atendido e não há utilidade adicional.
        """
        cfs = self._cfs_atuais(respostas)
        melhor: Optional[SelecaoPergunta] = None
        maximo = 0.0
        primeira_pendente: Optional[SelecaoPergunta] = None

        for p in self._kb.parametros:
            if p.id in respostas:
                continue
            selecao = self.utilidade(p.id, respostas, cfs)
            if primeira_pendente is None:
                primeira_pendente = selecao
            if selecao.utilidade > maximo:
                maximo = selecao.utilidade
                melhor = selecao

        if melhor is not None:
            return melhor

        # Se as perguntas de utilidade positiva acabaram, mas ainda não atingiu
        # o critério de parada (confiabilidade mínima/min_respostas do JSON)
        # e ainda existem parâmetros pendentes, continua perguntando para coletar evidências.
        ranking = self.ranking(respostas)
        parada = self.deve_parar(ranking, len(respostas))
        if not parada.parar and primeira_pendente is not None:
            return primeira_pendente

        return None

    def perguntas_pendentes(self, respostas: Respostas) -> int:
        """Quantidade de parâmetros da KB ainda não respondidos."""
        return sum(1 for p in self._kb.parametros if p.id not in respostas)

    # ------------------------------------------------------------ parada
    def deve_parar(self, ranking: List[AvaliacaoDoenca], n_respostas: int) -> DecisaoParada:
        """Critério de parada: líder com CF alto ou com boa vantagem sobre o 2º."""
        regra = self._kb.criterio_parada
        if not ranking or n_respostas < regra.min_respostas:
            return DecisaoParada(False, "")
        lider = ranking[0].cf
        segundo = ranking[1].cf if len(ranking) > 1 else -1.0
        if lider >= regra.cf_lider_forte:
            return DecisaoParada(
                True,
                f"Hipótese líder atingiu CF {lider:.2f} (>= {regra.cf_lider_forte:.2f}).",
            )
        if lider >= regra.cf_lider_moderado and (lider - segundo) >= regra.vantagem_minima:
            return DecisaoParada(
                True,
                f"Hipótese líder com CF {lider:.2f} e vantagem de {lider - segundo:.2f} "
                f"sobre a segunda (>= {regra.vantagem_minima:.2f}).",
            )
        return DecisaoParada(False, "")

    # ------------------------------------------------------------ auxiliares
    def _cfs_atuais(self, respostas: Respostas) -> Dict[str, float]:
        return {d.id: self.cf_doenca(d.id, respostas) for d in self._kb.doencas}

    def _texto_parametro(self, parametro_id: str) -> str:
        p = self._kb.parametro(parametro_id)
        return p.texto if p else parametro_id
