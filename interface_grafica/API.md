# Contrato da API — BioExpert

Formato das mensagens entre o front-end (`interface_grafica/`) e o back-end
(Python + clipspy). O back-end simulado em `js/mock.js` segue exatamente este formato.

## 1. Iniciar anamnese

`POST /api/anamnese` (sem corpo)

Resposta: uma **pergunta** (ver formato abaixo).

## 2. Responder pergunta

`POST /api/anamnese/{sessao}/resposta`

```json
{ "id": "febre", "valor": "sim" }
```

Resposta: a próxima **pergunta** ou o **diagnóstico**.

## Formatos de resposta

### Pergunta

```json
{
  "sessao": "abc123",
  "tipo": "pergunta",
  "pergunta": {
    "id": "febre",
    "texto": "O animal está com febre?",
    "ajuda": "Temperatura retal acima de 39,5 °C.",
    "resumo": "Febre",
    "opcoes": [
      { "valor": "sim", "rotulo": "Sim" },
      { "valor": "nao", "rotulo": "Não" },
      { "valor": "nao_sei", "rotulo": "Não sei" }
    ]
  }
}
```

| Campo     | Obrigatório | Uso                                                      |
|-----------|-------------|----------------------------------------------------------|
| `id`      | sim         | Nome do fato no CLIPS (ex.: `(resposta febre sim)`)      |
| `texto`   | sim         | Pergunta exibida na tela                                 |
| `opcoes`  | sim         | Botões exibidos; `valor` é o que volta para o back-end   |
| `ajuda`   | não         | Texto auxiliar abaixo da pergunta                        |
| `resumo`  | não         | Texto curto para o histórico (se ausente, usa `texto`)   |

### Diagnóstico

```json
{
  "sessao": "abc123",
  "tipo": "diagnostico",
  "diagnosticos": [
    {
      "id": "tristeza_parasitaria",
      "doenca": "Tristeza Parasitária Bovina",
      "certeza": 0.82,
      "justificativa": ["Febre", "Mucosas pálidas ou amareladas"],
      "recomendacao": "Isolar o animal e chamar um médico veterinário...",
      "alerta": "Texto opcional para casos urgentes/notificação obrigatória"
    }
  ],
  "mensagem": "Opcional: usado quando a lista de diagnósticos vem vazia"
}
```

- `diagnosticos` deve vir **ordenado** da maior para a menor `certeza` (0 a 1).
- `alerta` e `recomendacao` são opcionais.

## Erros

Responder com status HTTP de erro (`400` resposta inválida, `404` sessão inexistente,
`500` erro interno). O front exibe a mensagem e oferece "Tentar novamente".
