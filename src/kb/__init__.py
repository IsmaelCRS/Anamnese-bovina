"""
Camada 5a: Base de Conhecimento (Knowledge Base - KB)
Responsabilidade: Armazenamento declarativo e versionado de regras de produção
(em formato CLIPS .clp ou JSON), contendo condições, ações, saliência e Fatores
de Certeza (CF).
"""

from src.kb.loader import KB_PADRAO, KnowledgeBaseError, carregar_kb, construir_kb
from src.kb.models import (
    Criterio,
    CriterioParada,
    Doenca,
    FaixaClassificacao,
    KnowledgeBase,
    OpcaoResposta,
    Parametro,
)

__all__ = [
    "KB_PADRAO",
    "KnowledgeBaseError",
    "carregar_kb",
    "construir_kb",
    "Criterio",
    "CriterioParada",
    "Doenca",
    "FaixaClassificacao",
    "KnowledgeBase",
    "OpcaoResposta",
    "Parametro",
]
