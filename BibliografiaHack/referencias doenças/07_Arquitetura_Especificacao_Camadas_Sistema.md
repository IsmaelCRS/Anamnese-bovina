# Especificação de Arquitetura e Responsabilidades das Camadas

## Visão Geral
Documentação arquitetural do **Sistema Especialista Monolítico Local** de anamnese zootécnica.

## Divisão em 5 Pacotes / Camadas
1. **Camada de Apresentação (UI):**
   - Interface com usuário (GUI/TUI).
   - Coleta de dados e renderização visual, isolada da lógica de negócios.
2. **Orquestrador / Controlador de Sessão (PR e CTRL):**
   - Validação de dados de entrada.
   - Gerenciamento do fluxo de telas e controle de sessão de anamnese.
3. **Motor de Inferência (ENGINE):**
   - Execução das regras de inferência lógica.
   - Encadear raciocínio (forward/backward) e aplicar Fatores de Certeza.
4. **Memória de Trabalho (WM):**
   - Armazenamento em memória RAM dos fatos ativos durante a sessão.
5. **Base de Conhecimento e Dados (KB / DB):**
   - Persistência em SQLite para regras declarativas, histórico e tabelas auxiliares.
