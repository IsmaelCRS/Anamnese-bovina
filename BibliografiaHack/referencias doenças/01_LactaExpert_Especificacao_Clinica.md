# LactaExpert: Especificação Clínica e Estratégia MVP

## Visão Geral
O **LactaExpert** é um sistema especialista voltado para a triagem zootécnica e anamnese clínica virtual de vacas leiteiras em lactação e no período de transição.

## Pilares Clínicos Universais
O sistema é estruturado em três pilares fundamentais da saúde de bovinos de leite:
1. **Afecções da Glândula Mamária**
   - Mastite Clínica (sintomas visíveis no leite e no úbere)
   - Mastite Subclínica (alterações detectadas via CMT/CCS)
2. **Distúrbios Metabólicos do Periparto**
   - Hipocalcemia (Febre do Leite)
   - Cetose
   - Acidose Ruminal
3. **Enfermidades Infecciosas e Podais**
   - Tristeza Parasitária Bovina (TPB)
   - Lesões e enfermidades podais

## Motor de Inferência e Lógica
- **Fatores de Certeza (MYCIN):** Avaliação de incertezas e combinação de evidências sintomáticas.
- **Abordagem MVP:** O Produto Mínimo Viável implementa 3 enfermidades altamente distintas (uma de cada pilar) para validação do motor sem conflitos de regras.
- **Desacoplamento:** Separação estrita entre o código do motor de inferência e a base de conhecimento (regras declarativas), permitindo expansão simples por configuração.
