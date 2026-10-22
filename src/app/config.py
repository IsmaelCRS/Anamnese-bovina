"""
Configuração da aplicação, lida de variáveis de ambiente (12-factor).

=============================  ==========================================  =====================
Variável                       Significado                                 Padrão
=============================  ==========================================  =====================
``HOST``                       Interface de escuta do Uvicorn              ``0.0.0.0``
``PORT``                       Porta HTTP                                  ``8080``
``BIOEXPERT_KB_PATH``          Arquivo JSON da Base de Conhecimento        ``src/kb/regras_mvp.json``
``BIOEXPERT_DB_PATH``          Arquivo SQLite                              ``src/db/dados.db``
``BIOEXPERT_CORS_ORIGINS``     Origens CORS separadas por vírgula          ``*``
``BIOEXPERT_STATIC_DIR``       Diretório de arquivos estáticos do front    ``src/ui/static``
=============================  ==========================================  =====================
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Optional, Tuple

RAIZ_SRC = Path(__file__).resolve().parent.parent

APP_NOME = "BioExpert — Sistema Especialista de Anamnese Bovina"
APP_VERSAO = "1.0.0"


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    kb_path: Path
    db_path: Path
    cors_origins: Tuple[str, ...]
    static_dir: Path

    @classmethod
    def from_env(cls, env: Optional[Mapping[str, str]] = None) -> "Settings":
        env = os.environ if env is None else env
        origens = tuple(o.strip() for o in env.get("BIOEXPERT_CORS_ORIGINS", "*").split(",") if o.strip())
        return cls(
            host=env.get("HOST", "0.0.0.0"),
            port=int(env.get("PORT", "8080")),
            kb_path=Path(env.get("BIOEXPERT_KB_PATH", RAIZ_SRC / "kb" / "regras_mvp.json")),
            db_path=Path(env.get("BIOEXPERT_DB_PATH", RAIZ_SRC / "db" / "dados.db")),
            cors_origins=origens or ("*",),
            static_dir=Path(env.get("BIOEXPERT_STATIC_DIR", RAIZ_SRC / "ui" / "static")),
        )
