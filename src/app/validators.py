"""
Validador de entradas (PR) — sanitização e verificação semântica contra a KB.

A UI nunca valida regras de negócio; o PR é o único ponto onde uma entrada do
usuário é aceita ou recusada antes de virar fato na Memória de Trabalho.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from typing import Optional

from src.app.errors import EntradaInvalida
from src.app.schemas import AnswerRequest
from src.kb.models import KnowledgeBase

#: Tolerância ao comparar ``cf_valor`` com o CF da ``opcao`` quando ambos são enviados.
_TOLERANCIA_CF = 1e-9


@dataclass(frozen=True)
class RespostaValidada:
    parametro: str
    cf: float
    opcao: Optional[str]


class InputValidator:
    """Validação semântica das entradas, parametrizada pela Base de Conhecimento."""

    def __init__(self, kb: KnowledgeBase):
        self._kb = kb

    @staticmethod
    def validar_session_id(session_id: str) -> str:
        """Aceita apenas UUIDs canônicos (evita lixo/injeção em chaves de sessão)."""
        try:
            return str(uuid.UUID(session_id.strip()))
        except (ValueError, AttributeError):
            raise EntradaInvalida(f"session_id inválido: '{session_id}' (esperado UUID).") from None

    def validar_resposta(self, req: AnswerRequest) -> RespostaValidada:
        parametro = req.parametro.strip()
        if self._kb.parametro(parametro) is None:
            raise EntradaInvalida(f"parâmetro desconhecido na Base de Conhecimento: '{parametro}'.")

        opcao = req.opcao.strip().lower() if req.opcao is not None else None
        cf_opcao: Optional[float] = None
        if opcao is not None:
            item = self._kb.opcao(opcao)
            if item is None:
                validas = ", ".join(f"'{o.codigo}'" for o in self._kb.escala_respostas)
                raise EntradaInvalida(f"opção inválida: '{req.opcao}'. Use uma de: {validas}.")
            cf_opcao = item.cf

        cf_livre = req.cf_valor
        if cf_livre is not None and not math.isfinite(cf_livre):
            raise EntradaInvalida("cf_valor deve ser um número finito em [-1, 1].")

        if cf_opcao is not None and cf_livre is not None and abs(cf_opcao - cf_livre) > _TOLERANCIA_CF:
            raise EntradaInvalida(
                f"'opcao' ({opcao} = {cf_opcao}) e 'cf_valor' ({cf_livre}) são contraditórios; "
                "envie apenas um deles."
            )

        cf = cf_opcao if cf_opcao is not None else float(cf_livre)  # type: ignore[arg-type]
        return RespostaValidada(parametro=parametro, cf=cf, opcao=opcao)
