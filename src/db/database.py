"""
Conexão e esquema do banco SQLite local (Camada 5b).

Usa apenas ``sqlite3`` da biblioteca padrão: zero dependências nativas extras no
container. Cada operação abre uma conexão curta, o que é seguro para o pool de
threads do FastAPI e evita compartilhamento de conexões entre threads.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Union

#: Banco padrão: ``src/db/dados.db`` (diretório espelhado via volume no Docker).
DB_PADRAO = Path(__file__).resolve().parent / "dados.db"

ESQUEMA = """
CREATE TABLE IF NOT EXISTS sessoes (
    session_id              TEXT PRIMARY KEY,
    data_inicio             TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'em_andamento',
    diagnostico_final_json  TEXT
);

CREATE TABLE IF NOT EXISTS historico_respostas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL REFERENCES sessoes(session_id) ON DELETE CASCADE,
    parametro   TEXT    NOT NULL,
    valor_cf    REAL    NOT NULL CHECK (valor_cf BETWEEN -1.0 AND 1.0),
    timestamp   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historico_sessao
    ON historico_respostas (session_id, id);
"""


class Database:
    """Fábrica de conexões SQLite com criação automática do esquema."""

    def __init__(self, caminho: Union[str, Path, None] = None):
        self.caminho = Path(caminho) if caminho else DB_PADRAO

    def inicializar(self) -> None:
        """Cria o diretório, o arquivo e as tabelas caso ainda não existam."""
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        with self.conectar() as conn:
            conn.executescript(ESQUEMA)

    @contextmanager
    def conectar(self) -> Iterator[sqlite3.Connection]:
        """Conexão transacional: *commit* ao sair normalmente, *rollback* em erro."""
        conn = sqlite3.connect(self.caminho, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def ping(self) -> bool:
        """Verifica se o banco responde e se as tabelas obrigatórias existem."""
        with self.conectar() as conn:
            conn.execute("SELECT 1").fetchone()
            tabelas = {
                r["name"]
                for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
            }
        return {"sessoes", "historico_respostas"} <= tabelas
