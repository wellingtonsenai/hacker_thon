---
name: gerador-slides
description: Gera slides de apresentação a partir de um diagrama de arquitetura AWS renderizado
---

# Skill: Gerador de Slides (WIP)

## O que faz
Recebe um arquivo de arquitetura YAML e a imagem renderizada correspondente e produz um arquivo `.pptx` com slides de apresentação prontos para uso.

## Como usar
Informe o nome do caso de uso. Exemplos:
- "Gera slides para o caso api-rest-autenticada"
- "Cria apresentação do diagrama pipeline-ingestao"

## O que o Kiro faz
1. Lê o YAML em `/arquiteturas/<nome>.yaml` para extrair metadados
2. Usa a imagem renderizada em `/saida/<nome>-diagrama.png`
3. Monta os slides seguindo o template padrão
4. Exporta para `/slides/<nome>.pptx`

## Estrutura dos slides gerados
| Slide | Conteúdo |
|---|---|
| 1 | Título + descrição do caso de uso |
| 2 | Diagrama completo da arquitetura |
| 3 | Lista de serviços utilizados com breve descrição |
| 4 | Fluxo de dados passo a passo |
| 5 | Considerações de segurança e custo (se aplicável) |

## Restrições
- A imagem do diagrama deve existir em `/saida/` antes de chamar esta skill
- Requer `python-pptx` instalado
- Status: **WIP** — template base ainda em desenvolvimento
