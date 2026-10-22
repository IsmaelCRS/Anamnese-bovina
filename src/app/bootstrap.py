"""
Composição (injeção de dependências) das camadas 2 a 5.

É o único ponto que conhece as implementações concretas de KB, ENGINE, WM e DB.
A Camada 1 (UI) chama apenas :func:`criar_controlador`, preservando o
desacoplamento: a UI nunca importa ``src.engine``, ``src.wm``, ``src.kb`` ou
``src.db`` diretamente.
"""

from __future__ import annotations

from src.app.config import Settings
from src.app.controller import SessionController
from src.app.validators import InputValidator
from src.db import Database, SessaoRepository
from src.engine import InferenceEngine
from src.kb import carregar_kb
from src.wm import WorkingMemoryStore


def criar_controlador(settings: Settings) -> SessionController:
    """Carrega/valida a KB, cria o banco (se necessário) e monta o controlador.

    Falhas de KB (JSON inválido, referências quebradas) são propagadas
    imediatamente, impedindo o servidor de subir com conhecimento inconsistente.
    """
    kb = carregar_kb(settings.kb_path)
    db = Database(settings.db_path)
    db.inicializar()
    return SessionController(
        kb=kb,
        engine=InferenceEngine(kb),
        wm_store=WorkingMemoryStore(),
        db=db,
        repositorio=SessaoRepository(db),
        validador=InputValidator(kb),
    )
