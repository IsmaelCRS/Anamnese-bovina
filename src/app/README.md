# Camada 2: Aplicação, Validação de Inputs e Controladores (PR + CTRL)

## Responsabilidades:
- **PR (Processador / Validador):** Sanitização e validação sintática das entradas do usuário (ex.: conferir limites fisiológicos como temperatura entre 35,0 °C e 43,0 °C, escore corporal 1.0 a 5.0).
- **CTRL (Controlador de Sessão):** Orquestra o ciclo de vida do atendimento, instancia nova sessão na Memória de Trabalho (`src/wm/`), dispara o ciclo do motor (`src/engine/`), e persiste o laudo concluído no banco de dados (`src/db/`).
