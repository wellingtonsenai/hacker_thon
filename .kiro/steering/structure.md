---
inclusion: always
---

# Estrutura do Projeto

```
hacker_thon/
├── .kiro/
│   ├── steering/
│   │   ├── product.md          # visão de produto e funcionalidades
│   │   ├── tech.md             # stack técnica e padrões de código
│   │   ├── structure.md        # este arquivo — mapa do projeto
│   │   └── guia-visual-aws.md  # convenções visuais e ícones AWS
│   ├── skills/
│   │   ├── gerador-arquitetura/  # skill: gera YAML de arquitetura a partir de texto
│   │   └── gerador-slides/       # skill: gera slides a partir do diagrama (WIP)
│   ├── specs/
│   │   └── validador-arquitetura/  # spec formal do validador
│   ├── hooks/                  # hooks de automação do Kiro
│   └── settings/
│       └── mcp.json            # configuração de servidores MCP
│
├── renderizador/               # módulo de renderização visual dos diagramas
├── icones/                     # ícones oficiais AWS (PNG)
├── arquitetura/
│   └── validador.py            # validador de arquiteturas YAML
├── arquiteturas/               # arquiteturas definidas em YAML
├── casos/                      # casos de uso de exemplo em YAML
├── slides/                     # slides gerados
├── tests/                      # testes automatizados (pytest)
├── saida/                      # imagens e artefatos gerados
├── index.html                  # página de demonstração (frontend)
└── README.md
```

## Responsabilidade de cada pasta

| Pasta | O que vai aqui |
|---|---|
| `arquiteturas/` | Definições de arquitetura em YAML (`<nome>.yaml`) |
| `casos/` | Casos de uso de entrada (`<nome>.yaml`) usados como input para geração |
| `arquitetura/` | Código do validador e lógica de parsing de arquitetura |
| `renderizador/` | Código que converte YAML → imagem de diagrama |
| `icones/` | Ícones AWS estáticos, nunca baixados em runtime |
| `slides/` | Módulo gerador de slides + arquivos `.pptx` gerados |
| `saida/` | Imagens PNG/SVG dos diagramas renderizados |
| `tests/` | Testes `pytest` para todos os módulos |

## Convenção de nomes de arquivo
- Arquiteturas e casos: `kebab-case.yaml`
- Módulos Python: `snake_case.py`
- Ícones: `aws-<serviço>.png` (ex: `aws-lambda.png`)
- Saída: `<nome-caso>-diagrama.png`
