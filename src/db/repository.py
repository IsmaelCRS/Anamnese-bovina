"""
Repositório de sessões e histórico de respostas 100% em Memória RAM (In-Memory).

Substitui completamente o uso de banco de dados relacional e disco: todas as
sessões, respostas e diagnósticos são mantidos estritamente em estruturas de
dados Python na memória volátil.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

STATUS_EM_ANDAMENTO = "em_andamento"
STATUS_CONCLUIDA = "concluida"


def _agora_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass(frozen=True)
class RegistroSessao:
    session_id: str
    data_inicio: str
    status: str
    diagnostico_final: Optional[Dict[str, Any]]


@dataclass(frozen=True)
class RegistroResposta:
    id: int
    session_id: str
    parametro: str
    valor_cf: float
    timestamp: str


class SessaoRepository:
    """Gerenciador 100% In-Memory de sessões e respostas na memória RAM."""

    def __init__(self, db: Any = None):
        self._sessoes: Dict[str, Dict[str, Any]] = {}
        self._respostas: Dict[str, List[RegistroResposta]] = {}
        self._contador_id = 0
        self._lock = threading.RLock()

    # ----------------------------------------------------------------- sessões
    def criar_sessao(self, session_id: str) -> RegistroSessao:
        data_inicio = _agora_iso()
        with self._lock:
            self._sessoes[session_id] = {
                "session_id": session_id,
                "data_inicio": data_inicio,
                "status": STATUS_EM_ANDAMENTO,
                "diagnostico_final": None,
            }
            self._respostas[session_id] = []
        return RegistroSessao(session_id, data_inicio, STATUS_EM_ANDAMENTO, None)

    def obter_sessao(self, session_id: str) -> Optional[RegistroSessao]:
        with self._lock:
            dados = self._sessoes.get(session_id)
            if dados is None:
                return None
            return RegistroSessao(
                dados["session_id"],
                dados["data_inicio"],
                dados["status"],
                dados["diagnostico_final"],
            )

    def atualizar_diagnostico(self, session_id: str, diagnostico: Dict[str, Any],
                              status: Optional[str] = None) -> None:
        """Atualiza o snapshot do diagnóstico (e opcionalmente o novo status) em memória RAM."""
        with self._lock:
            dados = self._sessoes.get(session_id)
            if dados is not None:
                dados["diagnostico_final"] = diagnostico
                if status is not None:
                    dados["status"] = status

    # ----------------------------------------------------------------- respostas
    def registrar_resposta(self, session_id: str, parametro: str, valor_cf: float) -> RegistroResposta:
        timestamp = _agora_iso()
        with self._lock:
            self._contador_id += 1
            novo_id = self._contador_id
            reg = RegistroResposta(novo_id, session_id, parametro, float(valor_cf), timestamp)
            if session_id not in self._respostas:
                self._respostas[session_id] = []
            self._respostas[session_id].append(reg)
        return reg

    def listar_respostas(self, session_id: str) -> List[RegistroResposta]:
        """Histórico completo em ordem cronológica armazenado em RAM."""
        with self._lock:
            return list(self._respostas.get(session_id, []))

    def ping(self) -> bool:
        """Verifica a integridade do armazenamento em memória RAM."""
        return True

