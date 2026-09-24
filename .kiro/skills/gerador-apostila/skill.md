---
name: gerador-apostila
description: Gera apostilas didáticas em HTML prontas para exportação em PDF, seguindo o design system e padrão estrutural do projeto
---

# Skill: Gerador de Apostila

## Ativação
Esta skill é acionada quando o usuário usar qualquer uma das expressões abaixo:
- `gerarapostila <tema>`
- `gera apostila sobre <tema>`
- `crie uma apostila de <tema>`
- `apostila: <tema>`

## O que o Kiro faz
1. Pesquisa o conteúdo do tema (web ou base de conhecimento)
2. Estrutura o conteúdo nas seções padrão definidas abaixo
3. Gera o arquivo `apostila.html` na raiz do projeto
4. Segue **obrigatoriamente** o design system e as regras desta skill

---

## Design System (IMUTÁVEL)

### Paleta de cores
```
--primary:     #1E293B   (fundo hero, cabeçalhos de tabela, section-num)
--secondary:   #0EA5E9   (destaques, links, bordas de callout info)
--accent:      #F59E0B   (callout warn, barra de card accent)
--bg:          #FFFFFF   (fundo da página)
--text:        #334155   (texto principal)
--muted:       #64748B   (texto secundário, labels)
--surface:     #F8FAFC   (fundo de cards, quiz, objetivos)
--surface2:    #F1F5F9   (linhas alternadas de tabela)
--border:      #E2E8F0   (bordas gerais)
--success:     #10B981   (callout tip, gabarito correto)
--danger:      #EF4444   (reservado — não usar no PDF)
--code-bg:     #0F172A   (fundo de blocos de código)
```

### Tipografia
```
Títulos/UI:  Inter (Google Fonts) — weights 400, 600, 700
Corpo:       Roboto (Google Fonts) — weights 400, 500
Código:      JetBrains Mono (Google Fonts) — weights 400, 500
```
Link de importação obrigatório no `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Border radius
```
--radius:    8px   (elementos pequenos)
--radius-lg: 12px  (cards, blocos de código, quiz)
```

---

## Regras obrigatórias para PDF

> A apostila é gerada **sem nenhuma interatividade**. O HTML deve funcionar como um documento estático.

### ❌ NUNCA incluir:
- `<script>` de qualquer tipo
- `<input>`, `<button>`, `<select>`, `<textarea>`
- `onclick`, `oninput`, `onchange` ou qualquer handler de evento
- `cursor: pointer` no CSS
- `transition` ou `animation` no CSS
- Barra de progresso dinâmica
- Sidebar de navegação

### ✅ SEMPRE usar versão estática para:
| Elemento interativo | Substituição estática |
|---|---|
| Demo com slider RGB/HSL | Tabela de referência com amostras de cor (`<span>` colorido + `<code>`) |
| Quiz com botões clicáveis | Lista de alternativas com a correta destacada em verde + gabarito explicado |
| Barra de progresso | Remover completamente |
| Sidebar de navegação | Remover completamente |

---

## Estrutura obrigatória das seções

Cada seção deve seguir este cabeçalho:
```html
<section id="<id>">
  <div class="section-header">
    <div class="section-num">N</div>
    <div class="section-title-wrap">
      <h2>Título da Seção</h2>
      <div class="section-sub">Subtítulo descritivo</div>
    </div>
  </div>
  <!-- conteúdo -->
</section>
```

### Seções obrigatórias (nesta ordem):
1. **Capa / Hero** — `.hero` com título, subtítulo, tag de módulo e metadados (duração, nível, módulo, versão)
2. **Objetivos de Aprendizagem** — `.objetivos` com grid de 6 itens com ✓
3. **Seções de conteúdo** — mínimo 6, máximo 12 seções temáticas
4. **Exercício Prático** — problema visual com gabarito em callout `.tip`
5. **Resumo (Key Takeaways)** — `.cards` em grid 2×2 com 4 aprendizados principais
6. **Quiz de Fixação** — 5 perguntas estáticas com gabarito visível

---

## Componentes disponíveis

### Callouts (4 tipos)
```html
<!-- Info (azul) -->
<div class="callout">
  <div class="callout-title">📌 Nota</div>
  Texto...
</div>

<!-- Warn (âmbar) -->
<div class="callout warn">
  <div class="callout-title">⚠️ Atenção</div>
  Texto...
</div>

<!-- Tip (verde) -->
<div class="callout tip">
  <div class="callout-title">💡 Dica</div>
  Texto...
</div>

<!-- Key (azul escuro) -->
<div class="callout key">
  <div class="callout-title">🔑 Conceito-Chave</div>
  Texto...
</div>
```

### Bloco de código
```html
<pre>
  <div class="code-header">
    <div class="code-dots"><span class="d1"></span><span class="d2"></span><span class="d3"></span></div>
    <span class="code-lang">LINGUAGEM</span>
  </div>
  <div class="code-body"><code>
    <!-- código com spans de highlight -->
    <!-- .kw=roxo .prop=azul .val=verde .str=laranja .com=cinza .sel=amarelo -->
  </code></div>
</pre>
```

### Tabelas
```html
<div class="table-wrap">
  <table>
    <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
    <tbody>
      <tr><td>...</td><td>...</td></tr>
    </tbody>
  </table>
</div>
```

### Passo a passo (processo)
```html
<div class="steps">
  <div class="step">
    <div class="step-arrow"></div>
    <div class="step-num">1</div>
    <div class="step-title">Título</div>
    <div class="step-desc">Descrição curta</div>
  </div>
  <!-- último step não tem step-arrow -->
</div>
```

### Cards de resumo
```html
<div class="cards">
  <div class="card">          <!-- borda azul -->
  <div class="card accent">   <!-- borda âmbar -->
  <div class="card success">  <!-- borda verde -->
</div>
```

### Quiz estático
```html
<div class="quiz">
  <div class="quiz-q"><span class="q-num">1</span>Pergunta?</div>
  <div class="options">
    <div class="option"><span class="opt-letter">A</span>Opção errada</div>
    <div class="option correct"><span class="opt-letter">B</span>Opção correta</div>
    <div class="option"><span class="opt-letter">C</span>Opção errada</div>
  </div>
  <div class="quiz-answer">✅ Resposta: B — Explicação breve do motivo.</div>
</div>
```

### Amostra de cor (em tabelas)
```html
<span class="color-sample" style="background:#0EA5E9"></span>
<code>#0EA5E9</code>
```

---

## Layout e CSS base

O CSS completo e testado está em `apostila.html` na raiz do projeto.
**Copie exatamente o bloco `<style>` desse arquivo** como base para cada nova apostila gerada — não reescreva do zero.

A única adaptação permitida é adicionar classes específicas do tema (ex: diagramas, tabelas extras) sem modificar os tokens existentes.

---

## Regras de conteúdo

- **Bullet points** → expandir em 2–3 parágrafos com embasamento teórico e prático
- **Exemplos** → sempre incluir casos de uso reais do mundo profissional
- **Código** → usar syntax highlight com as classes `.kw .prop .val .str .com .sel`
- **Tom** → didático, profissional, encorajador e direto ao ponto
- **Idioma** → português brasileiro
- **Sem interatividade** → ver regras de PDF acima

---

## Saída esperada

- **Nome do arquivo:** derivado do tema em kebab-case, salvo na pasta `/apostilas/`
  - Formato: `apostilas/apostila-<tecnologia>-<topico>.html`
  - Exemplos:
    - `gerarapostila PHP Comentários` → `apostilas/apostila-php-comentarios.html`
    - `gerarapostila CSS Cores` → `apostilas/apostila-css-cores.html`
    - `gerarapostila JavaScript Funções` → `apostilas/apostila-javascript-funcoes.html`
- **Nunca sobrescrever** arquivos existentes — sempre criar um arquivo novo com nome único
- Autocontido: fontes via Google Fonts CDN, sem dependências locais
- Pronto para abrir no browser e imprimir/exportar como PDF via `Ctrl+P`
