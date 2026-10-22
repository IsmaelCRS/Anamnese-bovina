"""
Memória de Trabalho (Camada 4) — estado volátil em RAM, isolado por sessão.

Cada atendimento possui sua própria :class:`WorkingMemory`, contendo apenas os
fatos ``resposta`` (parâmetro + CF) informados pelo usuário. O
:class:`WorkingMemoryStore` gerencia o conjunto de sessões ativas de forma
thread-safe (o FastAPI executa endpoints síncronos em um pool de threads).

Nada aqui é persistido em disco: a persistência auditável é responsabilidade da
Camada 5b (``src/db``), orquestrada pelo controlador (``src/app``).
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional


def _agora() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class FatoResposta:
    """Fato ``(resposta (parametro ...) (cf ...))`` da memória de trabalho."""

    parametro: str
    cf: float
    opcao: Optional[str]
    registrado_em: datetime


class WorkingMemory:
    """Fatos ativos de UMA sessão de anamnese."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.criada_em = _agora()
        self._respostas: Dict[str, FatoResposta] = {}  # preserva ordem de inserção
        self._lock = threading.RLock()

    def registrar_resposta(self, parametro: str, cf: float, opcao: Optional[str] = None) -> FatoResposta:
        """Insere (ou substitui, em caso de correção) o fato ``resposta`` do parâmetro."""
        fato = FatoResposta(parametro=parametro, cf=float(cf), opcao=opcao, registrado_em=_agora())
        with self._lock:
            # Remover antes de reinserir mantém a ordem cronológica real.
            self._respostas.pop(parametro, None)
            self._respostas[parametro] = fato
        return fato

    def respostas(self) -> Dict[str, float]:
        """Cópia ``{parametro: cf}`` — formato consumido pelo motor de inferência."""
        with self._lock:
            return {p: f.cf for p, f in self._respostas.items()}

    def fatos(self) -> List[FatoResposta]:
        """Cópia ordenada cronologicamente dos fatos da sessão."""
        with self._lock:
            return list(self._respostas.values())

    def respondido(self, parametro: str) -> bool:
        with self._lock:
            return parametro in self._respostas

    def total_respostas(self) -> int:
        with self._lock:
            return len(self._respostas)

    def limpar(self) -> None:
        """Reinicia a memória (RF01 — nova anamnese)."""
        with self._lock:
            self._respostas.clear()


class WorkingMemoryStore:
    """Registro thread-safe das memórias de trabalho ativas, indexado por ``session_id``."""

    def __init__(self) -> None:
        self._sessoes: Dict[str, WorkingMemory] = {}
        self._lock = threading.RLock()

    def criar(self, session_id: str) -> WorkingMemory:
        with self._lock:
            if session_id in self._sessoes:
                raise KeyError(f"sessão já existe na memória de trabalho: {session_id}")
            wm = WorkingMemory(session_id)
            self._sessoes[session_id] = wm
            return wm

    def obter(self, session_id: str) -> Optional[WorkingMemory]:
        with self._lock:
            return self._sessoes.get(session_id)

    def remover(self, session_id: str) -> bool:
        with self._lock:
            return self._sessoes.pop(session_id, None) is not None

    def total(self) -> int:
        with self._lock:
            return len(self._sessoes)
