"""
Modelos imutáveis da Base de Conhecimento (Camada 5a).

Espelham fielmente os ``deftemplate`` do ``codigo_exemplo_base.md``:

    (deftemplate parametro (slot nome) (slot texto))
    (deftemplate doenca    (slot nome) (slot prior) (slot urgencia))
    (deftemplate criterio  (slot doenca) (slot parametro) (slot cf))

A ``resposta`` (parametro + cf) NÃO pertence à KB: é um fato da Memória de
Trabalho (``src/wm``). Os modelos aqui são apenas dados declarativos, sem lógica
de inferência.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class OpcaoResposta:
    """Opção da escala de respostas (ex.: ``s`` = Sim = CF 1.0)."""

    codigo: str
    rotulo: str
    cf: float


@dataclass(frozen=True)
class FaixaClassificacao:
    """Faixa de tradução do CF para linguagem clínica."""

    cf_minimo: float
    rotulo: str
    nivel: str
    recomendacao: str


@dataclass(frozen=True)
class CriterioParada:
    """Critério de parada do diálogo (ver ``deve_parar`` no código base)."""

    min_respostas: int
    cf_lider_forte: float
    cf_lider_moderado: float
    vantagem_minima: float


@dataclass(frozen=True)
class Parametro:
    """Pergunta da anamnese (template ``parametro``)."""

    id: str
    texto: str
    ajuda: str = ""
    categoria: str = ""


@dataclass(frozen=True)
class Doenca:
    """Hipótese diagnóstica (template ``doenca``)."""

    id: str
    nome: str
    prior: float
    urgencia: float
    pilar: str = ""
    sistema: str = ""
    descricao: str = ""
    conduta: str = ""


@dataclass(frozen=True)
class Criterio:
    """Conhecimento: ``parametro`` sustenta (cf > 0) ou enfraquece (cf < 0) ``doenca``."""

    doenca: str
    parametro: str
    cf: float
    justificativa: str = ""


@dataclass(frozen=True)
class KnowledgeBase:
    """Base de Conhecimento completa, já validada e indexada para consulta rápida.

    A ordem das tuplas preserva a ordem declarada no JSON, o que torna o
    desempate do motor de inferência totalmente determinístico.
    """

    nome: str
    versao: str
    descricao: str
    aviso: str
    fontes: Tuple[str, ...]
    escala_respostas: Tuple[OpcaoResposta, ...]
    classificacao: Tuple[FaixaClassificacao, ...]
    criterio_parada: CriterioParada
    doencas: Tuple[Doenca, ...]
    parametros: Tuple[Parametro, ...]
    criterios: Tuple[Criterio, ...]

    # Índices derivados (não fazem parte do JSON).
    _doencas_por_id: Dict[str, Doenca] = field(default_factory=dict, repr=False, compare=False)
    _parametros_por_id: Dict[str, Parametro] = field(default_factory=dict, repr=False, compare=False)
    _opcoes_por_codigo: Dict[str, OpcaoResposta] = field(default_factory=dict, repr=False, compare=False)
    _criterios_por_doenca: Dict[str, Tuple[Criterio, ...]] = field(default_factory=dict, repr=False, compare=False)
    _criterios_por_parametro: Dict[str, Tuple[Criterio, ...]] = field(default_factory=dict, repr=False, compare=False)

    def __post_init__(self) -> None:
        por_doenca: Dict[str, List[Criterio]] = {d.id: [] for d in self.doencas}
        por_parametro: Dict[str, List[Criterio]] = {p.id: [] for p in self.parametros}
        for c in self.criterios:
            por_doenca.setdefault(c.doenca, []).append(c)
            por_parametro.setdefault(c.parametro, []).append(c)

        # object.__setattr__ é necessário porque a dataclass é congelada.
        object.__setattr__(self, "_doencas_por_id", {d.id: d for d in self.doencas})
        object.__setattr__(self, "_parametros_por_id", {p.id: p for p in self.parametros})
        object.__setattr__(self, "_opcoes_por_codigo", {o.codigo: o for o in self.escala_respostas})
        object.__setattr__(self, "_criterios_por_doenca", {k: tuple(v) for k, v in por_doenca.items()})
        object.__setattr__(self, "_criterios_por_parametro", {k: tuple(v) for k, v in por_parametro.items()})

    # ------------------------------------------------------------------ consultas
    def doenca(self, doenca_id: str) -> Optional[Doenca]:
        return self._doencas_por_id.get(doenca_id)

    def parametro(self, parametro_id: str) -> Optional[Parametro]:
        return self._parametros_por_id.get(parametro_id)

    def opcao(self, codigo: str) -> Optional[OpcaoResposta]:
        return self._opcoes_por_codigo.get(codigo)

    def criterios_da_doenca(self, doenca_id: str) -> Tuple[Criterio, ...]:
        return self._criterios_por_doenca.get(doenca_id, ())

    def criterios_do_parametro(self, parametro_id: str) -> Tuple[Criterio, ...]:
        return self._criterios_por_parametro.get(parametro_id, ())
