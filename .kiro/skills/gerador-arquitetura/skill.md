---
name: gerador-arquitetura
description: Gera um arquivo YAML de arquitetura AWS a partir de uma descrição em linguagem natural
---

# Skill: Gerador de Arquitetura AWS

## O que faz
Recebe uma descrição em texto do caso de uso e produz um arquivo `.yaml` válido na pasta `/arquiteturas/`, seguindo o esquema definido no `guia-visual-aws.md`.

## Como usar
Descreva o caso de uso em português. Exemplos:
- "API REST com autenticação, banco relacional e cache"
- "Pipeline de ingestão de dados com SQS, Lambda e S3"
- "Aplicação web serverless com CloudFront, API Gateway e DynamoDB"

## O que o Kiro faz
1. Identifica os serviços AWS adequados para o caso
2. Define as conexões entre eles (síncronas ou assíncronas)
3. Valida os tipos contra a lista de ícones disponíveis (`/icones/`)
4. Gera o arquivo `arquiteturas/<nome-kebab-case>.yaml`

## Formato de saída
```yaml
nome: <nome-kebab-case>
descricao: <descrição do caso>
servicos:
  - id: <id-unico>
    tipo: aws-<serviço>
    nome: <nome legível>
    conexoes:
      - destino: <id-destino>
        tipo: sincrona | assincrona | bidirecional
```

## Restrições
- Usar apenas tipos de serviço listados em `guia-visual-aws.md`
- IDs em kebab-case, únicos dentro do arquivo
- Todo serviço deve ter ao menos uma conexão (entrada ou saída)
- Máximo de 15 serviços por diagrama para legibilidade
