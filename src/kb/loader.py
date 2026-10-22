"""
Carregador e validador da Base de Conhecimento declarativa (JSON).

Toda a validação estrutural/semântica da KB acontece aqui, na carga. Assim, o
Motor de Inferência pode assumir que os dados recebidos são consistentes e não
precisa de nenhuma regra "hard-coded": para adicionar doenças, parâmetros ou
critérios basta editar o JSON.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Mapping, Sequence, Union

from src.kb.models import (
    Criterio,
    CriterioParada,
    Doenca,
    FaixaClassificacao,
    KnowledgeBase,
    OpcaoResposta,
    Parametro,
)

#: Caminho padrão da base MVP, relativo a este pacote.
KB_PADRAO = Path(__file__).resolve().parent / "regras_mvp.json"


class KnowledgeBaseError(ValueError):
    """A Base de Conhecimento está mal formada ou inconsistente."""

    def __init__(self, erros: Sequence[str]):
        self.erros = list(erros)
        super().__init__("Base de Conhecimento inválida:\n  - " + "\n  - ".join(self.erros))


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------
def carregar_kb(caminho: Union[str, Path, None] = None) -> KnowledgeBase:
    """Lê, valida e devolve a KB a partir de um arquivo JSON."""
    caminho = Path(caminho) if caminho else KB_PADRAO
    if not caminho.is_file():
        raise KnowledgeBaseError([f"arquivo não encontrado: {caminho}"])
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise KnowledgeBaseError([f"JSON inválido em {caminho}: {exc}"]) from exc
    return construir_kb(dados)


def construir_kb(dados: Mapping[str, Any]) -> KnowledgeBase:
    """Valida um dicionário já desserializado e constrói a :class:`KnowledgeBase`."""
    erros: List[str] = []
    if not isinstance(dados, Mapping):
        raise KnowledgeBaseError(["a raiz do JSON deve ser um objeto"])

    meta = dados.get("meta") or {}
    escala = _ler_escala(dados.get("escala_respostas"), erros)
    classificacao = _ler_classificacao(dados.get("classificacao"), erros)
    parada = _ler_parada(dados.get("criterio_parada"), erros)
    doencas = _ler_doencas(dados.get("doencas"), erros)
    parametros = _ler_parametros(dados.get("parametros"), erros)
    criterios = _ler_criterios(dados.get("criterios"), doencas, parametros, erros)

    if erros:
        raise KnowledgeBaseError(erros)

    return KnowledgeBase(
        nome=str(meta.get("nome", "Base de Conhecimento")),
        versao=str(meta.get("versao", "0.0.0")),
        descricao=str(meta.get("descricao", "")),
        aviso=str(meta.get("aviso", "")),
        fontes=tuple(str(f) for f in meta.get("fontes", [])),
        escala_respostas=tuple(escala),
        classificacao=tuple(classificacao),
        criterio_parada=parada,  # type: ignore[arg-type]  # garantido sem erros
        doencas=tuple(doencas),
        parametros=tuple(parametros),
        criterios=tuple(criterios),
    )


# ---------------------------------------------------------------------------
# Leitores de seção
# ---------------------------------------------------------------------------
def _lista(valor: Any, secao: str, erros: List[str]) -> List[Dict[str, Any]]:
    if not isinstance(valor, list) or not valor:
        erros.append(f"'{secao}' deve ser uma lista não vazia")
        return []
    itens = []
    for i, item in enumerate(valor):
        if isinstance(item, dict):
            itens.append(item)
        else:
            erros.append(f"{secao}[{i}] deve ser um objeto")
    return itens


def _numero(item: Mapping[str, Any], chave: str, local: str, erros: List[str],
            minimo: float, maximo: float) -> float:
    valor = item.get(chave)
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        erros.append(f"{local}.{chave} deve ser numérico")
        return 0.0
    if not (minimo <= float(valor) <= maximo):
        erros.append(f"{local}.{chave}={valor} fora do intervalo [{minimo}, {maximo}]")
    return float(valor)


def _texto(item: Mapping[str, Any], chave: str, local: str, erros: List[str],
           obrigatorio: bool = True) -> str:
    valor = item.get(chave, "")
    if not isinstance(valor, str) or (obrigatorio and not valor.strip()):
        if obrigatorio:
            erros.append(f"{local}.{chave} deve ser um texto não vazio")
        return ""
    return valor.strip()


def _checar_duplicados(ids: List[str], secao: str, erros: List[str]) -> None:
    vistos = set()
    for i in ids:
        if i in vistos:
            erros.append(f"id duplicado em '{secao}': {i}")
        vistos.add(i)


def _ler_escala(valor: Any, erros: List[str]) -> List[OpcaoResposta]:
    opcoes = []
    for i, item in enumerate(_lista(valor, "escala_respostas", erros)):
        local = f"escala_respostas[{i}]"
        opcoes.append(OpcaoResposta(
            codigo=_texto(item, "codigo", local, erros),
            rotulo=_texto(item, "rotulo", local, erros),
            cf=_numero(item, "cf", local, erros, -1.0, 1.0),
        ))
    _checar_duplicados([o.codigo for o in opcoes], "escala_respostas", erros)
    return opcoes


def _ler_classificacao(valor: Any, erros: List[str]) -> List[FaixaClassificacao]:
    faixas = []
    for i, item in enumerate(_lista(valor, "classificacao", erros)):
        local = f"classificacao[{i}]"
        faixas.append(FaixaClassificacao(
            cf_minimo=_numero(item, "cf_minimo", local, erros, -1.0, 1.0),
            rotulo=_texto(item, "rotulo", local, erros),
            nivel=_texto(item, "nivel", local, erros),
            recomendacao=_texto(item, "recomendacao", local, erros, obrigatorio=False),
        ))
    # Ordena da faixa mais alta para a mais baixa e exige uma faixa "pega-tudo".
    faixas.sort(key=lambda f: f.cf_minimo, reverse=True)
    if faixas and faixas[-1].cf_minimo > -1.0:
        erros.append("classificacao deve conter uma faixa com cf_minimo = -1.0 (faixa padrão)")
    return faixas


def _ler_parada(valor: Any, erros: List[str]) -> CriterioParada | None:
    if not isinstance(valor, dict):
        erros.append("'criterio_parada' deve ser um objeto")
        return None
    local = "criterio_parada"
    min_resp = valor.get("min_respostas")
    if isinstance(min_resp, bool) or not isinstance(min_resp, int) or min_resp < 0:
        erros.append(f"{local}.min_respostas deve ser inteiro >= 0")
        min_resp = 0
    return CriterioParada(
        min_respostas=min_resp,
        cf_lider_forte=_numero(valor, "cf_lider_forte", local, erros, 0.0, 1.0),
        cf_lider_moderado=_numero(valor, "cf_lider_moderado", local, erros, 0.0, 1.0),
        vantagem_minima=_numero(valor, "vantagem_minima", local, erros, 0.0, 2.0),
    )


def _ler_doencas(valor: Any, erros: List[str]) -> List[Doenca]:
    doencas = []
    for i, item in enumerate(_lista(valor, "doencas", erros)):
        local = f"doencas[{i}]"
        urgencia = _numero(item, "urgencia", local, erros, 0.0, 100.0)
        if urgencia <= 0:
            erros.append(f"{local}.urgencia deve ser > 0")
        doencas.append(Doenca(
            id=_texto(item, "id", local, erros),
            nome=_texto(item, "nome", local, erros),
            prior=_numero(item, "prior", local, erros, -1.0, 1.0),
            urgencia=urgencia,
            pilar=_texto(item, "pilar", local, erros, obrigatorio=False),
            sistema=_texto(item, "sistema", local, erros, obrigatorio=False),
            descricao=_texto(item, "descricao", local, erros, obrigatorio=False),
            conduta=_texto(item, "conduta", local, erros, obrigatorio=False),
        ))
    _checar_duplicados([d.id for d in doencas], "doencas", erros)
    return doencas


def _ler_parametros(valor: Any, erros: List[str]) -> List[Parametro]:
    parametros = []
    for i, item in enumerate(_lista(valor, "parametros", erros)):
        local = f"parametros[{i}]"
        parametros.append(Parametro(
            id=_texto(item, "id", local, erros),
            texto=_texto(item, "texto", local, erros),
            ajuda=_texto(item, "ajuda", local, erros, obrigatorio=False),
            categoria=_texto(item, "categoria", local, erros, obrigatorio=False),
        ))
    _checar_duplicados([p.id for p in parametros], "parametros", erros)
    return parametros


def _ler_criterios(valor: Any, doencas: List[Doenca], parametros: List[Parametro],
                   erros: List[str]) -> List[Criterio]:
    ids_doenca = {d.id for d in doencas}
    ids_param = {p.id for p in parametros}
    criterios = []
    pares = set()
    for i, item in enumerate(_lista(valor, "criterios", erros)):
        local = f"criterios[{i}]"
        c = Criterio(
            doenca=_texto(item, "doenca", local, erros),
            parametro=_texto(item, "parametro", local, erros),
            cf=_numero(item, "cf", local, erros, -1.0, 1.0),
            justificativa=_texto(item, "justificativa", local, erros, obrigatorio=False),
        )
        if c.doenca and c.doenca not in ids_doenca:
            erros.append(f"{local}: doença desconhecida '{c.doenca}'")
        if c.parametro and c.parametro not in ids_param:
            erros.append(f"{local}: parâmetro desconhecido '{c.parametro}'")
        if (c.doenca, c.parametro) in pares:
            erros.append(f"{local}: critério duplicado ({c.doenca}, {c.parametro})")
        pares.add((c.doenca, c.parametro))
        criterios.append(c)

    # Parâmetros sem nenhum critério nunca teriam utilidade > 0 e jamais seriam
    # perguntados: isso quase sempre é um erro de modelagem da KB.
    usados = {c.parametro for c in criterios}
    for p in parametros:
        if p.id not in usados:
            erros.append(f"parâmetro '{p.id}' não é referenciado por nenhum critério")
    return criterios
