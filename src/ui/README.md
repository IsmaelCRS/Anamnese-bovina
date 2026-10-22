# Camada 1: Interface do Usuário (UI)

## Responsabilidades:
- Renderização visual e captura de eventos do usuário (produtor / veterinário).
- Exibição das perguntas da anamnese clínica com suporte a Fator de Certeza (CF) e opção "Não Sei".
- Apresentação do parecer final ranqueado por certeza e do módulo de explicação (Por quê? e Como?).
- **Regra arquitetural:** A UI não valida regras de negócio nem consulta diretamente o banco de dados; ela comunica-se exclusivamente com a Camada 2 (`src/app/`).
