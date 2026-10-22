# Camada 3: Motor de Inferência (ENGINE)

## Responsabilidades:
- Execução do ciclo determinístico *Match-Resolve-Act* por encadeamento para frente (*Forward Chaining*).
- Resolução de conflitos guiada por hierarquia de saliência clínica:
  - 100: Emergência (ex: Tristeza Parasitária Bovina)
  - 90: Urgência (ex: Hipocalcemia)
  - 80: Alta (ex: Mastite Clínica Aguda, Acidose Ruminal)
  - 60: Média-Alta (ex: Cetose)
  - 50: Média (ex: Mastite Subclínica)
- Acúmulo de Fatores de Certeza utilizando a fórmula clássica do modelo MYCIN:
  $$CF_{\text{acumulado}} = CF_1 + CF_2 \cdot (1 - CF_1)$$
- Geração da árvore de explicabilidade (*Explanation Facility*) detalhando o encadeamento de regras disparadas.
