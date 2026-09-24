#!/usr/bin/env node
/**
 * html-para-pdf.mjs
 * Converte um arquivo HTML de apostila para PDF usando Puppeteer (headless Chrome).
 *
 * Uso:
 *   node scripts/html-para-pdf.mjs <caminho-do-html>
 *
 * Exemplos:
 *   node scripts/html-para-pdf.mjs apostilas/apostila-php-comentarios.html
 *   node scripts/html-para-pdf.mjs apostilas/apostila-aws-cloud-computing.html
 *
 * Pré-requisitos:
 *   npm install puppeteer
 *   npx puppeteer browsers install chrome
 */

import { createRequire } from 'module';
import { resolve }       from 'path';
import { existsSync }    from 'fs';

const require = createRequire(import.meta.url);

// ── Argumentos ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (!args[0]) {
  console.error('\n❌  Uso: node scripts/html-para-pdf.mjs <caminho-do-html>');
  console.error('   Exemplo: node scripts/html-para-pdf.mjs apostilas/apostila-php-comentarios.html\n');
  process.exit(1);
}

const htmlPath = resolve(args[0]);

if (!existsSync(htmlPath)) {
  console.error(`\n❌  Arquivo não encontrado: ${htmlPath}\n`);
  process.exit(1);
}

const outPath  = htmlPath.replace(/\.html$/i, '.pdf');
const outLabel = outPath.replace(resolve('.') + '\\', '').replace(resolve('.') + '/', '');

console.log(`\n📄  Convertendo : ${args[0]}`);
console.log(`📥  Saída       : ${outLabel}\n`);

// ── Carrega Puppeteer ─────────────────────────────────────────────────────────
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('❌  Puppeteer não encontrado.');
  console.error('   Execute: npm install puppeteer && npx puppeteer browsers install chrome\n');
  process.exit(1);
}

// ── Lança o browser ───────────────────────────────────────────────────────────
let browser;
try {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
} catch (err) {
  console.error(`\n❌  Falha ao iniciar o Chrome: ${err.message}`);
  console.error('   Execute: npx puppeteer browsers install chrome\n');
  process.exit(1);
}

// ── Gera o PDF ────────────────────────────────────────────────────────────────
const page    = await browser.newPage();
const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500)); // aguarda Google Fonts

await page.pdf({
  path:            outPath,
  format:          'A4',
  printBackground: true,
  margin:          { top: '15mm', bottom: '18mm', left: '12mm', right: '12mm' },
  displayHeaderFooter: true,
  headerTemplate:  '<div></div>',
  footerTemplate:  `
    <div style="width:100%;font-size:9px;color:#94A3B8;font-family:Arial,sans-serif;
                display:flex;justify-content:space-between;padding:0 12mm;box-sizing:border-box;">
      <span>LAB365 × SENAI · Workshop Kiro &amp; Agentes na AWS</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>`,
});

await browser.close();
console.log(`✅  PDF gerado: ${outLabel}\n`);
