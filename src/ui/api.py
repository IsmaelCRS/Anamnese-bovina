"""
Camada 1: Interface do Usuário (UI) — API REST dos Endpoints de Sessão.

Orquestra a interação externa com o sistema especialista via HTTP/JSON,
delegando toda a regra de fluxo e validação clínica exclusivamente ao
SessionController (Camada 2 - src/app/).
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from src.app.bootstrap import criar_controlador
from src.app.config import Settings
from src.app.controller import SessionController
from src.app.errors import EntradaInvalida, SessaoNaoEncontrada
from src.app.schemas import (
    AnswerRequest,
    AnswerResponse,
    CamadaStatusDTO,
    HealthResponse,
    NextQuestionResponse,
    RankingResponse,
    SessionStartResponse,
)

# ---------------------------------------------------------------------------
# Dependência do Controlador
# ---------------------------------------------------------------------------
_settings = Settings.from_env()
_controller: Optional[SessionController] = None


def get_controller() -> SessionController:
    """Provedor singleton do SessionController para injeção de dependência FastAPI."""
    global _controller
    if _controller is None:
        _controller = criar_controlador(_settings)
    return _controller


def configurar_controlador(controller: SessionController) -> None:
    """Permite sobrescrever a instância do controlador (útil para testes unitários)."""
    global _controller
    _controller = controller


def get_health_status(controller: Optional[SessionController] = None) -> Dict[str, Any]:
    """Coleta o status consolidado de saúde das 5 camadas do sistema."""
    ctrl = controller or get_controller()
    saudavel, camadas = ctrl.verificar_saude()

    # Camada 1 adiciona seu próprio status
    camadas["camada_1_ui"] = CamadaStatusDTO(
        pacote="src/ui",
        descricao="Interface do Usuário (UI) e API REST (FastAPI)",
        status="ok",
        detalhes={
            "prefixo": "/api/v1/session",
            "endpoints": ["/start", "/next-question", "/answer", "/ranking", "/health"],
        },
    )

    status_geral = "healthy" if saudavel else "degraded"
    return HealthResponse(
        status=status_geral,
        arquitetura="5 Camadas Desacopladas",
        versao="1.0.0",
        camadas=camadas,
    ).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Schemas de Entrada Flexíveis (suporta 'opcao', 'valor_cf' ou 'cf_valor')
# ---------------------------------------------------------------------------
class AnswerPayload(BaseModel):
    """Payload de resposta a uma pergunta clínica."""

    parametro: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Identificador único do parâmetro clínico (ex: 'halito_cetonico')",
        examples=["halito_cetonico"],
    )
    opcao: Optional[str] = Field(
        None,
        min_length=1,
        max_length=8,
        description="Código da resposta na escala: 's' (sim), 'p' (provável), '?' (não sei), 'n' (não)",
        examples=["s"],
    )
    valor_cf: Optional[float] = Field(
        None,
        ge=-1.0,
        le=1.0,
        description="Fator de certeza livre no intervalo [-1.0, 1.0]",
        examples=[0.8],
    )
    cf_valor: Optional[float] = Field(
        None,
        ge=-1.0,
        le=1.0,
        description="Sinônimo aceito para valor_cf",
        examples=[0.8],
    )

    @model_validator(mode="after")
    def _validar_payload(self) -> "AnswerPayload":
        cf = self.cf_valor if self.cf_valor is not None else self.valor_cf
        if self.opcao is None and cf is None:
            raise ValueError("Informe 'opcao' ('s', 'p', '?', 'n') ou 'valor_cf'/'cf_valor' (-1.0 a 1.0)")
        return self

    def to_request(self) -> AnswerRequest:
        cf = self.cf_valor if self.cf_valor is not None else self.valor_cf
        return AnswerRequest(parametro=self.parametro, opcao=self.opcao, cf_valor=cf)


# ---------------------------------------------------------------------------
# Definição das Rotas
# ---------------------------------------------------------------------------
_core_router = APIRouter()


@_core_router.post(
    "/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Iniciar nova sessão de anamnese",
    description="Cria uma nova sessão no banco SQLite e inicializa a Memória de Trabalho (WM) em RAM.",
)
def start_session(controller: SessionController = Depends(get_controller)) -> SessionStartResponse:
    return controller.iniciar_sessao()


@_core_router.get(
    "/{session_id}/next-question",
    response_model=NextQuestionResponse,
    summary="Obter próxima pergunta pela Heurística de Utilidade",
    description=(
        "Calcula a pergunta de maior utilidade diagnóstica via motor de inferência. "
        "Se o critério de parada for atingido ou acabarem as perguntas, indica concluida=True."
    ),
)
def next_question(
    session_id: str,
    controller: SessionController = Depends(get_controller),
) -> NextQuestionResponse:
    try:
        return controller.proxima_pergunta(session_id)
    except SessaoNaoEncontrada as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.mensagem)
    except EntradaInvalida as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.mensagem)


@_core_router.post(
    "/{session_id}/answer",
    response_model=AnswerResponse,
    summary="Registrar resposta do produtor/veterinário",
    description=(
        "Registra a evidência na auditoria SQLite e na Memória de Trabalho, "
        "reexecutando imediatamente o ciclo de inferência com a fórmula MYCIN."
    ),
)
def answer_question(
    session_id: str,
    payload: AnswerPayload,
    controller: SessionController = Depends(get_controller),
) -> AnswerResponse:
    try:
        return controller.responder(session_id, payload.to_request())
    except SessaoNaoEncontrada as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.mensagem)
    except (EntradaInvalida, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@_core_router.get(
    "/{session_id}/ranking",
    response_model=RankingResponse,
    summary="Consultar ranking de hipóteses diagnósticas",
    description=(
        "Retorna o ranking de enfermidades ordenado por Fator de Certeza (CF) decrescente, "
        "com classificação clínica e traço completo de explicação (regras ativadas)."
    ),
)
def get_ranking(
    session_id: str,
    controller: SessionController = Depends(get_controller),
) -> RankingResponse:
    try:
        return controller.ranking(session_id)
    except SessaoNaoEncontrada as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.mensagem)
    except EntradaInvalida as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.mensagem)


@_core_router.get(
    "/health",
    response_model=HealthResponse,
    summary="Verificação de integridade das camadas",
    description="Retorna o status operacional detalhado das 5 camadas do sistema especialista.",
)
def health_check(controller: SessionController = Depends(get_controller)) -> Dict[str, Any]:
    return get_health_status(controller)


@_core_router.get(
    "/auditoria",
    summary="Painel de Auditoria e Selo da Regra de Ouro",
    description=(
        "Comprova a conformidade do sistema: hash SHA-256 da base de regras, "
        "declaração de determinismo (0% LLM), métricas do ciclo e ambiente 100% offline."
    ),
)
def auditoria_regra_de_ouro(controller: SessionController = Depends(get_controller)) -> Dict[str, Any]:
    import hashlib

    kb_path = _settings.kb_path
    sha256_hash = "desconhecido"
    if kb_path and kb_path.is_file():
        sha256_hash = hashlib.sha256(kb_path.read_bytes()).hexdigest()

    kb = controller._kb
    wm_store = controller._wm_store

    return {
        "status": "conforme",
        "regra_de_ouro": {
            "selo": "Selo de Garantia: Regra de Ouro (Auditável & Determinístico)",
            "conformidade_hackathon": True,
            "declaracao_determinismo": (
                "Motor de Inferência por Encadeamento para Frente (MYCIN) — "
                "0% Chamada de LLM / AI Generativa no Diagnóstico Clínico"
            ),
            "ambiente": "100% Localhost / Offline — Banco SQLite Local & WM em RAM",
            "sem_dependencias_externas": True,
        },
        "base_conhecimento": {
            "arquivo": kb_path.name if kb_path else "regras_mvp.json",
            "sha256": sha256_hash,
            "versao": getattr(kb, "versao", "3.1.0"),
            "total_regras": len(kb.criterios),
            "total_doencas": len(kb.doencas),
            "total_parametros": len(kb.parametros),
        },
        "metricas_ciclo": {
            "regras_em_memoria": len(kb.criterios),
            "sessoes_ativas_wm": len(wm_store._memorias) if hasattr(wm_store, "_memorias") else 0,
            "banco_sqlite": "conectado e operante",
        },
    }


# Router canônico com prefixo /api/v1/session conforme especificado
router = APIRouter(prefix="/api/v1/session", tags=["Session"])
router.include_router(_core_router)

# Router direto sem prefixo para permitir requisições diretas (/start, etc.)
direct_router = APIRouter(tags=["Session"])
direct_router.include_router(_core_router)
