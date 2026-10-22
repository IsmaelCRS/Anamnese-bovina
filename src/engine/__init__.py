"""
Camada 3: Motor de Inferência (ENGINE)
Responsabilidade: Núcleo do motor dedutivo (Forward Chaining),
resolução de conflito por saliência/prioridade, cálculo de incerteza (MYCIN CF)
e geração do traço de explicabilidade (Como e Por quê).
"""

from src.engine.certainty import combinar_cf, limitar_cf
from src.engine.inference import (
    AvaliacaoDoenca,
    ComponenteUtilidade,
    DecisaoParada,
    EvidenciaSemEfeito,
    InferenceEngine,
    PassoInferencia,
    SelecaoPergunta,
)

__all__ = [
    "combinar_cf",
    "limitar_cf",
    "AvaliacaoDoenca",
    "ComponenteUtilidade",
    "DecisaoParada",
    "EvidenciaSemEfeito",
    "InferenceEngine",
    "PassoInferencia",
    "SelecaoPergunta",
]
