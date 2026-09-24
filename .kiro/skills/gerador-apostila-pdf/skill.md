---
name: gerador-apostila-pdf
description: Gera apostila didática completa (HTML + PDF) seguindo o design system do projeto, convertendo automaticamente para PDF via Puppeteer
---

# Skill: Gerador de Apostila PDF

## Ativação
Esta skill é acionada quando o usuário usar qualquer uma das expressões abaixo:
- `gerarapostilapdf <tema>`
- `gerarapostilapdf <tema> <url>`
- `gera apostila pdf sobre <tema>`
- `crie uma apostila pdf de <tema>`

## O que o Kiro faz
1. Executa **todos os passos da skill `gerador-apostila`** para gerar o HTML
2. Após salvar o HTML em `apostilas/apostila-<tecnologia>-<topico>.html`, roda o script de conversão:
   ```
   node scripts/html-para-pdf.mjs apostilas/apostila-<tecnologia>-<topico>.html
   ```
3. O PDF é salvo no mesmo diretório com o mesmo nome base:
   `apostilas/apostila-<tecnologia>-<topico>.pdf`

## Pré-requisito
O Puppeteer deve estar instalado:
```
npm install puppeteer
```
O script `scripts/html-para-pdf.mjs` deve existir na raiz do projeto.

## Saída esperada
```
apostilas/
  apostila-php-comentarios.html   ← gerado pelo passo 1
  apostila-php-comentarios.pdf    ← gerado pelo passo 2
```

## Configurações do PDF
Definidas em `scripts/html-para-pdf.mjs`:
- Formato: **A4**
- Margens: 15mm topo/base, 12mm lados
- `printBackground: true` — preserva fundos coloridos (hero, callouts, tabelas)
- `waitUntil: networkidle0` — aguarda Google Fonts carregar antes de capturar
- Rodapé: "LAB365 × SENAI · Workshop Kiro & Agentes na AWS" + numeração de página

## Regras de conteúdo do HTML
Seguir **exatamente** as mesmas regras da skill `gerador-apostila`:
- Design system idêntico (paleta, fontes, componentes)
- Zero interatividade (`<script>`, `<input>`, `<button>` são proibidos)
- Estrutura: capa → objetivos → seções → exercício → resumo → quiz estático
- Ver `.kiro/skills/gerador-apostila/skill.md` para detalhes completos

## Tratamento de erros
Se o Puppeteer não estiver instalado ou o script falhar:
1. O HTML já terá sido gerado normalmente em `apostilas/`
2. Informar o usuário para rodar manualmente:
   ```
   node scripts/html-para-pdf.mjs apostilas/<nome>.html
   ```
3. Alternativa manual no browser: abrir o HTML, pressionar `Ctrl+P` → salvar como PDF
