"""
Camada 5b: Banco de Dados Local (DB)
Responsabilidade: Persistência relacional em disco (SQLite dados.db)
para cadastro de animais, histórico de anamneses e laudos emitidos.
"""

from src.db.database import DB_PADRAO, Database
from src.db.repository import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANDAMENTO,
    RegistroResposta,
    RegistroSessao,
    SessaoRepository,
)

__all__ = [
    "DB_PADRAO",
    "Database",
    "STATUS_CONCLUIDA",
    "STATUS_EM_ANDAMENTO",
    "RegistroResposta",
    "RegistroSessao",
    "SessaoRepository",
]
