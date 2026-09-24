---
inclusion: always
---

# Design system LAB365 × SENAI (slides)

- Template oficial: `slides/template/lab365.pptx` (layouts com gradiente, logos LAB365/SENAI e fonte Lexend embutida). Tokens: `slides/tokens.json`.
- Paleta: azul `#0E1D8E` (títulos), magenta `#C71D81` (eyebrow/rótulos), roxo `#85228B`, laranja `#F08305`; texto `#0C0C0C` / `#3A3A40`; cards pastel `#FEF1E2`, `#FBE8F2`, `#F4E8F5`, `#E8EAF6`.
- Slide de conteúdo: eyebrow 7,5 pt magenta + título 22 pt azul em caixa alta no mesmo lugar; margem 0,354"; nada fora da área segura.
- Slides são gerados SEMPRE por `python -m slides.gerador decks/<nome>.yaml` (skill `gerador-slides`). Não existe painel web.
