"""
Repositório de sessões e histórico auditável de respostas (Camada 5b).

O repositório não conhece regras clínicas nem o motor: apenas grava e lê dados
estruturados. O diagnóstico é recebido já serializável (dict) do controlador.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.db.database import Database

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
    """Operações de persistência das tabelas ``sessoes`` e ``historico_respostas``."""

    def __init__(self, db: Database):
        self._db = db

    # ----------------------------------------------------------------- sessões
    def criar_sessao(self, session_id: str) -> RegistroSessao:
        data_inicio = _agora_iso()
        with self._db.conectar() as conn:
            conn.execute(
                "INSERT INTO sessoes (session_id, data_inicio, status) VALUES (?, ?, ?)",
                (session_id, data_inicio, STATUS_EM_ANDAMENTO),
            )
        return RegistroSessao(session_id, data_inicio, STATUS_EM_ANDAMENTO, None)

    def obter_sessao(self, session_id: str) -> Optional[RegistroSessao]:
        with self._db.conectar() as conn:
            row = conn.execute(
                "SELECT session_id, data_inicio, status, diagnostico_final_json "
                "FROM sessoes WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        if row is None:
            return None
        diag = json.loads(row["diagnostico_final_json"]) if row["diagnostico_final_json"] else None
        return RegistroSessao(row["session_id"], row["data_inicio"], row["status"], diag)

    def atualizar_diagnostico(self, session_id: str, diagnostico: Dict[str, Any],
                              status: Optional[str] = None) -> None:
        """Grava o snapshot do diagnóstico (e opcionalmente o novo status)."""
        payload = json.dumps(diagnostico, ensure_ascii=False)
        with self._db.conectar() as conn:
            if status is None:
                conn.execute(
                    "UPDATE sessoes SET diagnostico_final_json = ? WHERE session_id = ?",
                    (payload, session_id),
                )
            else:
                conn.execute(
                    "UPDATE sessoes SET diagnostico_final_json = ?, status = ? WHERE session_id = ?",
                    (payload, status, session_id),
                )

    # ----------------------------------------------------------------- respostas
    def registrar_resposta(self, session_id: str, parametro: str, valor_cf: float) -> RegistroResposta:
        timestamp = _agora_iso()
        with self._db.conectar() as conn:
            cur = conn.execute(
                "INSERT INTO historico_respostas (session_id, parametro, valor_cf, timestamp) "
                "VALUES (?, ?, ?, ?)",
                (session_id, parametro, float(valor_cf), timestamp),
            )
            novo_id = int(cur.lastrowid)
        return RegistroResposta(novo_id, session_id, parametro, float(valor_cf), timestamp)

    def listar_respostas(self, session_id: str) -> List[RegistroResposta]:
        """Histórico completo, em ordem cronológica (inclui correções)."""
        with self._db.conectar() as conn:
            rows = conn.execute(
                "SELECT id, session_id, parametro, valor_cf, timestamp "
                "FROM historico_respostas WHERE session_id = ? ORDER BY id",
                (session_id,),
            ).fetchall()
        return [
            RegistroResposta(r["id"], r["session_id"], r["parametro"], r["valor_cf"], r["timestamp"])
            for r in rows
        ]
