# Código Exemplo Base — Sistema Especialista de Anamnese para Gado Leiteiro

Este código exemplifica a implementação de um **Sistema Especialista de Anamnese** em Python utilizando a biblioteca `clipspy` (CLIPS) e o modelo de combinação de Fatores de Certeza (**MYCIN**).

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema especialista de anamnese para gado leiteiro (CLIPS via clipspy).

Uso:
    pip install clipspy
    python anamnese_leiteira.py          # modo interativo
    python anamnese_leiteira.py --demo   # roda um caso de exemplo sozinho

ATENÇÃO: doenças, priors e CFs abaixo são ILUSTRATIVOS. Devem ser definidos
e validados por um médico-veterinário antes de qualquer uso real.
"""

import sys
import clips

# ---------------------------------------------------------------------------
# 1. TEMPLATES (estruturas de dados do CLIPS)
# ---------------------------------------------------------------------------
TEMPLATES = [
    # Catálogo de perguntas
    "(deftemplate parametro (slot nome) (slot texto))",
    # Doença: prior = CF inicial; urgencia = gravidade (peso na escolha da pergunta)
    "(deftemplate doenca (slot nome) (slot prior) (slot urgencia))",
    # Conhecimento: este parâmetro, se presente, sustenta (cf > 0) ou enfraquece
    # (cf < 0) a doença
    "(deftemplate criterio (slot doenca) (slot parametro) (slot cf))",
    # MEMÓRIA DE TRABALHO: CF da evidência (1.0 = sim, 0.6 = provavelmente,
    # 0.0 = não sei, -1.0 = não). Só existe depois que o usuário responde.
    "(deftemplate resposta (slot parametro) (slot cf))",
    # Controle
    "(deftemplate proxima (slot parametro) (slot texto))",
    "(deftemplate recalcular)",
]

# ---------------------------------------------------------------------------
# 2. FUNÇÕES (a ordem importa: cada uma só usa as definidas antes)
# ---------------------------------------------------------------------------
FUNCOES = [
    # Combinação de dois CFs (fórmula do MYCIN). Independe da ordem.
    """
    (deffunction combinar-cf (?a ?b)
        (if (and (>= ?a 0) (>= ?b 0)) then
            (return (+ ?a (* ?b (- 1 ?a)))))
        (if (and (<= ?a 0) (<= ?b 0)) then
            (return (+ ?a (* ?b (+ 1 ?a)))))
        (return (/ (+ ?a ?b) (- 1 (min (abs ?a) (abs ?b))))))
    """,
    # CF atual de uma doença: parte do prior e combina a contribuição de cada
    # critério cujo parâmetro foi respondido com evidência positiva.
    # contribuição = CF da regra x CF da evidência
    """
    (deffunction cf-doenca (?nome)
        (bind ?cf 0.0)
        (do-for-fact ((?d doenca)) (eq ?d:nome ?nome)
            (bind ?cf ?d:prior))
        (do-for-all-facts ((?c criterio) (?r resposta))
                          (and (eq ?c:doenca ?nome)
                               (eq ?c:parametro ?r:parametro)
                               (> ?r:cf 0))
            (bind ?cf (combinar-cf ?cf (* ?c:cf ?r:cf))))
        (return ?cf))
    """,
    """
    (deffunction urgencia-doenca (?nome)
        (bind ?u 1.0)
        (do-for-fact ((?d doenca)) (eq ?d:nome ?nome)
            (bind ?u ?d:urgencia))
        (return ?u))
    """,
    # Utilidade de perguntar um parâmetro. Para cada doença ligada a ele:
    #   |CF da regra| x (1 - |CF atual|) x urgência x (1 + CF atual) / 2
    #   - |CF da regra|     : quanto a resposta pode mover a doença
    #   - (1 - |CF atual|)  : ainda há espaço para mover (não está decidida)
    #   - urgência          : doenças graves ganham prioridade
    #   - (1 + CF atual)/2  : doenças já refutadas pesam menos
    """
    (deffunction utilidade (?param)
        (bind ?u 0.0)
        (do-for-all-facts ((?c criterio)) (eq ?c:parametro ?param)
            (bind ?atual (cf-doenca ?c:doenca))
            (bind ?u (+ ?u (* (abs ?c:cf)
                             (- 1 (abs ?atual))
                             (urgencia-doenca ?c:doenca)
                             (/ (+ 1 ?atual) 2)))))
        (return ?u))
    """,
]

# ---------------------------------------------------------------------------
# 3. REGRA que escolhe a próxima pergunta
# ---------------------------------------------------------------------------
REGRAS = [
    """
    (defrule escolher-proxima-pergunta
        ?r <- (recalcular)
        =>
        (retract ?r)
        (bind ?melhor FALSE)
        (bind ?texto "")
        (bind ?max 0.0)
        ;; só parâmetros ainda sem resposta
        (do-for-all-facts ((?p parametro))
                          (not (any-factp ((?x resposta)) (eq ?x:parametro ?p:nome)))
            (bind ?u (utilidade ?p:nome))
            (if (> ?u ?max) then
                (bind ?max ?u)
                (bind ?melhor ?p:nome)
                (bind ?texto ?p:texto)))
        (if (neq ?melhor FALSE) then
            (assert (proxima (parametro ?melhor) (texto ?texto)))))
    """,
]

# ---------------------------------------------------------------------------
# 4. BASE DE CONHECIMENTO (exemplo ilustrativo)
# ---------------------------------------------------------------------------
BASE = """
(deffacts conhecimento
    (parametro (nome queda-producao)  (texto "Houve queda na produção de leite?"))
    (parametro (nome febre)           (texto "A temperatura retal está acima de 39,5 °C?"))
    (parametro (nome ruminacao-baixa) (texto "O tempo de ruminação está abaixo de 300 min/dia?"))
    (parametro (nome leite-alterado)  (texto "O leite apresenta grumos ou aspecto alterado?"))
    (parametro (nome ubere-inchado)   (texto "O úbere está inchado, quente ou dolorido?"))
    (parametro (nome halito-cetonico) (texto "O animal tem hálito com odor de acetona?"))
    (parametro (nome reduz-apetite)   (texto "Houve redução do apetite?"))
    (parametro (nome fezes-liquidas)  (texto "As fezes estão líquidas?"))
    (parametro (nome parto-recente)   (texto "O parto foi nas últimas semanas?"))
    (parametro (nome decubito)        (texto "O animal está deitado e não consegue levantar?"))

    (doenca (nome mastite)      (prior 0.30) (urgencia 2.0))
    (doenca (nome cetose)       (prior 0.20) (urgencia 2.0))
    (doenca (nome acidose)      (prior 0.15) (urgencia 2.0))
    (doenca (nome hipocalcemia) (prior 0.10) (urgencia 3.0))

    (criterio (doenca mastite) (parametro leite-alterado)   (cf  0.70))
    (criterio (doenca mastite) (parametro ubere-inchado)    (cf  0.70))
    (criterio (doenca mastite) (parametro queda-producao)   (cf  0.30))
    (criterio (doenca mastite) (parametro febre)            (cf  0.20))

    (criterio (doenca cetose) (parametro halito-cetonico) (cf  0.80))
    (criterio (doenca cetose) (parametro reduz-apetite)   (cf  0.40))
    (criterio (doenca cetose) (parametro queda-producao)  (cf  0.30))
    (criterio (doenca cetose) (parametro parto-recente)   (cf  0.30))

    (criterio (doenca acidose) (parametro ruminacao-baixa) (cf  0.70))
    (criterio (doenca acidose) (parametro fezes-liquidas)  (cf  0.60))
    (criterio (doenca acidose) (parametro reduz-apetite)   (cf  0.40))

    (criterio (doenca hipocalcemia) (parametro decubito)       (cf  0.80))
    (criterio (doenca hipocalcemia) (parametro parto-recente)  (cf  0.30))
    (criterio (doenca hipocalcemia) (parametro febre)          (cf -0.40))
)
"""

# CF da evidência para cada tecla digitada pelo usuário
RESPOSTAS = {
    "s": 1.0,    # sim
    "p": 0.6,    # provavelmente sim
    "?": 0.0,    # não sei
    "n": -1.0,   # não
}

# Caso usado no modo --demo (parâmetros fora daqui são respondidos "n")
CASO_DEMO = {
    "parto-recente": "s",
    "halito-cetonico": "s",
    "reduz-apetite": "p",
    "queda-producao": "s",
}

# ---------------------------------------------------------------------------
# 5. CONTROLADOR (Python)
# ---------------------------------------------------------------------------
def montar_ambiente():
    """Cria o ambiente CLIPS e carrega templates, funções, regras e base."""
    env = clips.Environment()
    for construto in TEMPLATES + FUNCOES + REGRAS + [BASE]:
        env.build(construto)
    env.reset()  # instancia os deffacts
    return env


def fatos(env, nome_template):
    """Lista (como dicts) todos os fatos de um template."""
    return [dict(f) for f in env.facts() if f.template.name == nome_template]


def proxima_pergunta(env):
    """Pede ao CLIPS para escolher a próxima pergunta. None = sem mais perguntas."""
    env.assert_string("(recalcular)")
    env.run()
    for f in env.facts():
        if f.template.name == "proxima":
            d = dict(f)
            f.retract()  # consome o fato de controle
            return str(d["parametro"]), str(d["texto"])
    return None


def ranking(env):
    """Doenças ordenadas por CF decrescente: [(cf, nome), ...]."""
    itens = []
    for d in fatos(env, "doenca"):
        nome = str(d["nome"])
        itens.append((float(env.eval(f"(cf-doenca {nome})")), nome))
    return sorted(itens, reverse=True)


def classificar(cf):
    """Traduz o CF em linguagem natural."""
    if cf >= 0.80:
        return "forte indício"
    if cf >= 0.40:
        return "provável"
    return "inconclusivo"


def deve_parar(rk, n_respostas):
    """Critério de parada: líder com CF alto ou com boa vantagem sobre o 2º."""
    if n_respostas < 3:
        return False
    lider, segundo = rk[0][0], rk[1][0]
    return lider >= 0.80 or (lider >= 0.60 and lider - segundo >= 0.30)


def doencas_relacionadas(criterios, param):
    return sorted({str(c["doenca"]) for c in criterios if str(c["parametro"]) == param})


def explicar(doenca, criterios, respostas):
    """Lista as evidências que sustentam a doença, com a contribuição de cada uma."""
    linhas = []
    for c in criterios:
        p = str(c["parametro"])
        if str(c["doenca"]) == doenca and respostas.get(p, 0.0) > 0:
            contrib = float(c["cf"]) * respostas[p]
            linhas.append((contrib, p.replace("-", " ")))
    for contrib, p in sorted(linhas, reverse=True):
        print(f"    - {p}: contribuição {contrib:+.2f}")
    if not linhas:
        print("    (nenhuma evidência confirmada até agora)")


def main():
    demo = "--demo" in sys.argv
    env = montar_ambiente()
    criterios = fatos(env, "criterio")
    respostas = {}  # espelho em Python das respostas dadas (parâmetro -> CF)

    print("=== Sistema Especialista de Anamnese (Leiteira) ===")
    if demo:
        print("[Modo DEMO ativado]")
    else:
        print("Responda com: s = sim, p = provavelmente, ? = não sei, n = não
")

    n_respostas = 0
    while True:
        res = proxima_pergunta(env)
        if not res:
            print("
Sem mais perguntas disponíveis.")
            break

        param, texto = res

        if demo:
            resp_str = CASO_DEMO.get(param, "n")
            print(f"
[DEMO] {texto} ({param}) -> {resp_str}")
        else:
            resp_str = input(f"
{texto} [s/p/?/n]: ").strip().lower()
            while resp_str not in RESPOSTAS:
                resp_str = input("Opção inválida. Digite s, p, ? ou n: ").strip().lower()

        cf_evidencia = RESPOSTAS[resp_str]
        respostas[param] = cf_evidencia
        n_respostas += 1

        env.assert_string(f"(resposta (parametro {param}) (cf {cf_evidencia}))")

        rk = ranking(env)
        lider_cf, lider_nome = rk[0]
        print(f"-> Hipótese principal: {lider_nome.upper()} (CF = {lider_cf:+.2f} - {classificar(lider_cf)})")

        if deve_parar(rk, n_respostas):
            print("
[Critério de parada atingido]")
            break

    rk = ranking(env)
    print("
" + "=" * 50)
    print("DIAGNÓSTICO FINAL (Hipóteses Ranqueadas):")
    print("=" * 50)
    for cf, nome in rk:
        print(f"
* {nome.upper()}: CF = {cf:+.2f} ({classificar(cf)})")
        explicar(nome, criterios, respostas)


if __name__ == "__main__":
    main()
```
