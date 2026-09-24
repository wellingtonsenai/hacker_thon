#!/usr/bin/env node
/**
 * render.mjs — CLI do renderizador de diagramas AWS v2.
 *
 * Uso:
 *   node renderizador/render.mjs <yaml> <saida.png> [--icons <pasta>] [--svg-only]
 *
 * Exemplos:
 *   node renderizador/render.mjs arquiteturas/apostilas.yaml saida/apostilas.png --icons icones
 *   node renderizador/render.mjs casos/exemplo.yaml saida/exemplo.png --svg-only
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, extname, basename } from 'path';
import { createRequire } from 'module';

import { carregarDoc }    from './schema.mjs';
import { calcularLayout } from './layout.mjs';
import { carregarTodos }  from './icones.mjs';
import { calcularGrupos } from './grupos.mjs';
import { calcularArestas }from './arestas.mjs';
import { montar }         from './svg.mjs';

const require = createRequire(import.meta.url);

// ─── Parse de argumentos ─────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const yamlPath  = args[0];
const outArg    = args[1];

if (!yamlPath || !outArg) {
  console.error('Uso: node renderizador/render.mjs <yaml> <saida.png> [--icons <pasta>] [--svg-only]');
  process.exit(1);
}

const iconsIdx  = args.indexOf('--icons');
const iconsDir  = iconsIdx !== -1 ? resolve(args[iconsIdx + 1]) : resolve('icones');
const svgOnly   = args.includes('--svg-only');

const outResolvido = resolve(outArg);
const ext          = extname(outArg).toLowerCase();
const base         = ext ? outArg.slice(0, -ext.length) : outArg;
const svgPath      = resolve(base + '.svg');
const pngPath      = resolve(base + '.png');

// Garantir que o diretório de saída existe
mkdirSync(dirname(outResolvido), { recursive: true });

// ─── Pipeline ────────────────────────────────────────────────────────────────

let doc;
try {
  // Validação de ícones: passar iconsDir para verificar arquivos referenciados
  doc = carregarDoc(yamlPath, iconsDir);
} catch (e) {
  console.error(`✘ ${e.message}`);
  process.exit(1);
}

// 1. Layout
const nos = calcularLayout(doc.servicos, doc.grupos ?? []);

// 2. Ícones
const icones = carregarTodos(doc.servicos, iconsDir);

// 3. Grupos
const gruposBbox = calcularGrupos(doc.grupos ?? [], nos);

// 4. Arestas
const arestas = calcularArestas(doc.fluxo ?? [], nos, gruposBbox);

// 5. SVG
const svgStr = montar(doc, nos, icones, gruposBbox, arestas);

// 6. Gravar SVG (sempre)
writeFileSync(svgPath, svgStr, 'utf8');
console.log(`✔ SVG: ${svgPath}`);

// 7. Gravar PNG (quando não --svg-only)
if (!svgOnly) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.warn('⚠ sharp não está instalado — apenas SVG gerado.');
    console.warn('  Para PNG: npm install sharp && npm approve-scripts sharp');
    process.exit(0);
  }

  try {
    await sharp(Buffer.from(svgStr), { density: 216 })
      .png({ quality: 100, compressionLevel: 6 })
      .toFile(pngPath);
    console.log(`✔ PNG: ${pngPath}`);
  } catch (e) {
    console.error(`✘ Erro ao gerar PNG: ${e.message}`);
    console.error('  O SVG foi gerado e pode ser convertido manualmente.');
    process.exit(1);
  }
}
