"""
DTOs (Pydantic v2) — contrato público da API consumido pelo Front-end.

A validação *estrutural* (tipos, faixas, campos obrigatórios) acontece aqui. A
validação *semântica* contra a Base de Conhecimento (parâmetro existe? opção
existe?) fica em :mod:`src.app.validators` (PR).
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

StatusSessao = Literal["em_andamento", "concluida"]


class _DTO(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------
class AnswerRequest(_DTO):
    """Resposta a um parâmetro. Informe ``opcao`` **ou** ``cf_valor`` (RF02/RF03)."""

    parametro: str = Field(..., min_length=1, max_length=64, examples=["halito_cetonico"],
                           description="Identificador do parâmetro (campo `parametro` da pergunta).")
    opcao: Optional[str] = Field(None, min_length=1, max_length=8, examples=["s"],
                                 description="Código da escala: `s`=1.0, `p`=0.6, `?`=0.0, `n`=-1.0.")
    cf_valor: Optional[float] = Field(None, ge=-1.0, le=1.0, examples=[0.8],
                                      description="Grau de certeza livre da evidência, em [-1, 1].")

    @model_validator(mode="after")
    def _exige_opcao_ou_cf(self) -> "AnswerRequest":
        if self.opcao is None and self.cf_valor is None:
            raise ValueError("informe 'opcao' ou 'cf_valor'")
        return self


# ---------------------------------------------------------------------------
# Blocos reutilizáveis
# ---------------------------------------------------------------------------
class OpcaoDTO(_DTO):
    codigo: str
    rotulo: str
    cf: float


class ComponenteUtilidadeDTO(_DTO):
    """Parcela da utilidade da pergunta por doença — responde "Por que esta pergunta?"."""

    doenca_id: str
    doenca_nome: str
    cf_criterio: float
    cf_atual: float
    urgencia: float
    contribuicao: float


class PerguntaDTO(_DTO):
    parametro: str
    texto: str
    ajuda: str
    categoria: str
    opcoes: List[OpcaoDTO]
    utilidade: float
    justificativa: List[ComponenteUtilidadeDTO]


class ProgressoDTO(_DTO):
    respondidas: int
    total_parametros: int
    pendentes: int


class EvidenciaDTO(_DTO):
    """Passo do traço de inferência — responde "Como se chegou a este CF?"."""

    parametro: str
    pergunta: str
    cf_resposta: float
    cf_criterio: float
    contribuicao: float
    cf_antes: float
    cf_depois: float
    efeito: Literal["reforca", "enfraquece"]
    justificativa: str


class EvidenciaSemEfeitoDTO(_DTO):
    parametro: str
    pergunta: str
    cf_resposta: float
    cf_criterio: float


class HipoteseDTO(_DTO):
    posicao: int
    doenca_id: str
    nome: str
    pilar: str
    sistema: str
    cf: float
    cf_percentual: float
    prior: float
    urgencia: float
    classificacao: str
    nivel: str
    recomendacao: str
    conduta: str
    explicacao: List[EvidenciaDTO]
    evidencias_sem_efeito: List[EvidenciaSemEfeitoDTO]


# ---------------------------------------------------------------------------
# Respostas dos endpoints
# ---------------------------------------------------------------------------
class SessionStartResponse(_DTO):
    session_id: str
    status: StatusSessao
    data_inicio: str
    kb_nome: str
    kb_versao: str
    escala_respostas: List[OpcaoDTO]
    total_parametros: int
    aviso: str


class NextQuestionResponse(_DTO):
    session_id: str
    concluida: bool
    motivo: Optional[str] = None
    pergunta: Optional[PerguntaDTO] = None
    progresso: ProgressoDTO


class RankingResponse(_DTO):
    session_id: str
    status: StatusSessao
    total_respostas: int
    criterio_parada_atingido: bool
    motivo_conclusao: Optional[str] = None
    hipotese_principal: Optional[HipoteseDTO] = None
    ranking: List[HipoteseDTO]
    kb_versao: str
    aviso: str


class RespostaRegistradaDTO(_DTO):
    parametro: str
    opcao: Optional[str]
    cf_evidencia: float
    substituiu_resposta_anterior: bool


class AnswerResponse(_DTO):
    session_id: str
    registrada: RespostaRegistradaDTO
    diagnostico: RankingResponse


class CamadaStatusDTO(_DTO):
    pacote: str
    descricao: str
    status: Literal["ok", "erro"]
    detalhes: Dict[str, object] = Field(default_factory=dict)


class HealthResponse(_DTO):
    status: Literal["healthy", "degraded"]
    arquitetura: str
    versao: str
    camadas: Dict[str, CamadaStatusDTO]
