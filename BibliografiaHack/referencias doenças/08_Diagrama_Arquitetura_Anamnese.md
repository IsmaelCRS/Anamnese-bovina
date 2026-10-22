# Diagrama da Arquitetura do Sistema Especialista de Anamnese

## Visão Geral
Descrição do diagrama esquemático visual da aplicação local de anamnese.

## Fluxo de Comunicação
```
[ Interface UI ] <---> [ Controlador / Orquestrador ] <---> [ Motor de Inferência (ENGINE) ]
                                                                     |
                                                       +-------------+-------------+
                                                       |                           |
                                           [ Memória de Trabalho ]      [ Base de Conhecimento / DB ]
                                                  (RAM)                       (SQLite & Rules)
```

## Características
- Execução local em computador do usuário.
- Fluxo de dados estruturado e orientado a objetos.
- Desacoplamento entre motor de inferência e base de conhecimento.
