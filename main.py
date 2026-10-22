import clips

veterinario = "Ismael"
print(f"Iniciando sistema de anamnese bovina - Responsavel: {veterinario}\n")

# Criando o ambiente do CLIPS
env = clips.Environment()

# Definindo uma regra basica de anamnese
env.build("""
(defrule diagnostico-febre-aftosa
   (sintoma febre)
   (sintoma vesiculas-na-boca)
   =>
   (printout t ">>> Alerta Clinico: Suspeita de Febre Aftosa detectada pelas regras do CLIPS!" crlf))
""")

# Inserindo fatos (sintomas observados)
env.assert_string("(sintoma febre)")
env.assert_string("(sintoma vesiculas-na-boca)")

print("Sintomas cadastrados na memoria (fatos do CLIPS):")
for fact in env.facts():
    print(f" - {fact}")

print("\nDisparando o motor de inferencia:")
env.run()