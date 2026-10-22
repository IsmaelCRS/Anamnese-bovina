# Camada 5b: Banco de Dados Local (DB)

## Responsabilidades:
- Armazenamento permanente relacional em SQLite (`dados.db`).
- Persistência dos registros de:
  - Ficha cadastral do bovino (identificação, lote, raça, fase fisiológica, data de parto).
  - Histórico de atendimentos/anamneses realizados.
  - Laudos gerados com suas respectivas probabilidades e traço de regras.
- O volume `./src/db` é mapeado no Docker Compose para garantir que as gravações do SQLite persistam entre reinicializações do container.
