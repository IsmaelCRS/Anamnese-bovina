"""
Camada 1: Interface do Usuário (UI)
Responsabilidade: Telas, componentes visuais, formulários interativos de anamnese
e renderização de laudos explicáveis (traço de regras disparadas).
"""

from src.ui.api import direct_router, get_health_status, router

__all__ = ["router", "direct_router", "get_health_status"]
