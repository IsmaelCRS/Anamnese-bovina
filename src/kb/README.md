# Camada 5a: Base de Conhecimento (KB)

## Responsabilidades:
- Conhecimento de sanidade bovina estruturado de forma declarativa e versionada em arquivos (`.clp` ou `.json`).
- Mapeamento das afecções clínicas:
  1. **Glândula Mamária:** Mastite Clínica Aguda e Mastite Subclínica.
  2. **Distúrbios Metabólicos do Periparto:** Hipocalcemia (Febre do Leite), Cetose e Acidose Ruminal.
  3. **Enfermidades Infecciosas / Parasitárias:** Tristeza Parasitária Bovina (TPB).
  4. **Afecções Podais e Estresse Térmico**.
- Definição explícita de `SE <condições> ENTÃO <conclusões>` com respectivos pesos e saliência.
- O volume `./src/kb` é montado no container para permitir edição e persistência das regras sem necessidade de rebuild.
