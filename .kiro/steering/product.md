---
inclusion: always
---

# Produto

## Visão Geral
Ferramenta de geração e validação de arquiteturas AWS a partir de linguagem natural ou arquivos YAML. O sistema interpreta um caso de uso, monta o diagrama com ícones oficiais da AWS, valida as conexões entre serviços e exporta slides de apresentação prontos para uso.

## Público-alvo
Arquitetos de soluções, engenheiros de nuvem e times de produto que precisam documentar e apresentar arquiteturas AWS rapidamente.

## Problemas que resolve
- Criar diagramas de arquitetura manualmente é lento e sujeito a erros
- Manter ícones e padrões visuais AWS atualizados é trabalhoso
- Validar se uma arquitetura faz sentido (serviços isolados, conexões inválidas) exige revisão manual

## Funcionalidades principais
1. **Gerador de arquitetura** — recebe descrição em texto ou YAML e produz um diagrama estruturado
2. **Validador de arquitetura** — detecta erros de design (serviços isolados, conexões inválidas, tipos desconhecidos)
3. **Renderizador visual** — converte o diagrama em imagem usando ícones oficiais da AWS
4. **Gerador de slides** — empacota o diagrama e metadados em slides de apresentação

## Métricas de sucesso
- Diagrama gerado em menos de 10 segundos
- Zero falsos negativos na validação de conexões inválidas
- Slides exportados em formato compatível com Google Slides / PowerPoint
