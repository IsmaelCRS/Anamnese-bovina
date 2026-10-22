"""
Interface de persistência desativada (100% In-Memory / RAM).

O uso de SQLite em disco foi totalmente removido do sistema: toda a
operação de sessões e respostas ocorre estritamente na memória volátil (RAM).
Esta classe é mantida como adaptador leve sem efeitos colaterais em disco.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Union

DB_PADRAO = Path(__file__).resolve().parent / "dados.db"


class Database:
    """Adaptador de compatibilidade sem operações em disco (100% In-Memory)."""

    def __init__(self, caminho: Union[str, Path, None] = None):
        self.caminho = Path(caminho) if caminho else DB_PADRAO

    def inicializar(self) -> None:
        """Operação no-op: nenhum arquivo SQLite ou tabela é criado em disco."""
        pass

    def ping(self) -> bool:
        """Sempre saudável: armazenamento operacional 100% em RAM."""
        return True

