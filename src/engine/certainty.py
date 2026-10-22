"""
Álgebra de Fatores de Certeza do modelo MYCIN.

Reprodução fiel, em Python puro, da ``deffunction combinar-cf`` do
``codigo_exemplo_base.md``::

    (deffunction combinar-cf (?a ?b)
        (if (and (>= ?a 0) (>= ?b 0)) then
            (return (+ ?a (* ?b (- 1 ?a)))))
        (if (and (<= ?a 0) (<= ?b 0)) then
            (return (+ ?a (* ?b (+ 1 ?a)))))
        (return (/ (+ ?a ?b) (- 1 (min (abs ?a) (abs ?b))))))

A combinação é comutativa e associativa para sinais iguais, portanto o
resultado independe da ordem em que as evidências chegam.
"""

from __future__ import annotations

CF_MIN = -1.0
CF_MAX = 1.0


def limitar_cf(cf: float) -> float:
    """Restringe ``cf`` ao intervalo canônico [-1, 1] (proteção contra arredondamento)."""
    return max(CF_MIN, min(CF_MAX, cf))


def combinar_cf(a: float, b: float) -> float:
    """Combina dois Fatores de Certeza independentes (fórmula MYCIN).

    * ambos >= 0  ->  a + b * (1 - a)
    * ambos <= 0  ->  a + b * (1 + a)
    * sinais opostos -> (a + b) / (1 - min(|a|, |b|))

    Caso-limite: com sinais opostos e um dos CFs igual a ±1 (certeza absoluta
    contra certeza absoluta) o denominador é zero e a fórmula é indefinida. O
    código CLIPS original abortaria com divisão por zero; aqui adotamos a
    convenção usual de MYCIN de que evidências totalmente contraditórias se
    anulam (retorna 0.0).
    """
    if a >= 0 and b >= 0:
        return limitar_cf(a + b * (1 - a))
    if a <= 0 and b <= 0:
        return limitar_cf(a + b * (1 + a))
    denominador = 1 - min(abs(a), abs(b))
    if denominador == 0:
        return 0.0
    return limitar_cf((a + b) / denominador)
