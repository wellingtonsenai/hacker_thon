---
name: gerador-slides
description: Gera apresentações .pptx no design system LAB365 × SENAI sobre qualquer assunto. Use quando pedirem slides, apresentação, deck ou PPT.
---

# Gerador de slides LAB365

A IA escreve o `deck.yaml`, o código desenha. Nunca monte o PPTX à mão: o visual (template oficial, gradientes, logos, Lexend, cores, ícones) vem do gerador.

## Passo a passo
1. Leia `references/tipos-de-slide.md` (campos, limites de caracteres e exemplo de cada tipo).
2. Pesquise/organize o conteúdo do assunto pedido. Textos em português do Brasil, curtos e concretos.
3. Escreva `decks/<nome-em-kebab-case>.yaml`:
   ```yaml
   titulo: "Nome do deck"
   eyebrow: "ASSUNTO  ·  LAB365"      # linha magenta no topo de cada slide de conteúdo
   autor: "Nome"
   slides:
     - tipo: capa
       ...
   ```
4. Rode `python -m slides.gerador decks/<nome>.yaml --preview`.
5. Se aparecer `[ERRO]`, corrija o YAML exatamente no campo apontado e rode de novo (erro = nada é gerado). Trate os `[AVISO]` também.
6. Entregue `saida/<nome>.pptx` (e `saida/<nome>-preview.png` se existir).

## Regras de composição (deck atrativo)
- Estrutura: `capa` → `secao` a cada 3–4 slides → conteúdo → `fechamento` → `encerramento`.
- 8 a 14 slides. Nunca 3 slides do mesmo tipo seguidos; use pelo menos 4 tipos de conteúdo diferentes.
- Escolha o tipo pelo formato da ideia: etapas → `processo`; números → `numeros`; A x B → `comparacao`; frase forte → `citacao`; conceitos paralelos → `cards`; lista simples → `conteudo` (use pouco).
- Títulos curtos (viram CAIXA ALTA). Um slide = uma mensagem. Use `nota` para a conclusão do slide ("Destaque: texto").
- Ícones: nomes Lucide em kebab-case (`rocket`, `shield-check`, `banknote`). Para achar: `python -m slides.buscar_icone <termo em inglês>`.
- Cores seguem sozinhas a sequência laranja → magenta → roxo → azul; só use `cor` para dar significado.
- Use `notas` em cada slide com o roteiro de fala.
