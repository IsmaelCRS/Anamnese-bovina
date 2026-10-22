"""
Camada 2: Aplicação (PR + CTRL)
Responsabilidade: Validação de inputs sanitizados, orquestração de fluxo,
gerenciamento de sessão de anamnese e comunicação entre UI, WM e ENGINE.
"""

from src.app.bootstrap import criar_controlador
from src.app.config import APP_NOME, APP_VERSAO, Settings
from src.app.controller import SessionController
from src.app.errors import AppError, EntradaInvalida, SessaoNaoEncontrada

__all__ = [
    "APP_NOME",
    "APP_VERSAO",
    "AppError",
    "EntradaInvalida",
    "SessaoNaoEncontrada",
    "SessionController",
    "Settings",
    "criar_controlador",
]
