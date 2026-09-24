#!/usr/bin/env node
/**
 * render.mjs — Renderizador de diagramas de arquitetura AWS
 *
 * Uso:
 *   node renderizador/render.mjs <yaml> <saida.png> [--icons <pasta>]
 *
 * Exemplo:
 *   node renderizador/render.mjs arquiteturas/apostilas.yaml saida/apostilas.png --icons icones
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml    = require('js-yaml');

// ─── argumentos ──────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const yamlPath = args[0];
const outPath  = args[1];

if (!yamlPath || !outPath) {
  console.error('Uso: node renderizador/render.mjs <yaml> <saida.png> [--icons <pasta>]');
  process.exit(1);
}

const iconsIdx = args.indexOf('--icons');
const iconsDir = iconsIdx !== -1 ? resolve(args[iconsIdx + 1]) : resolve('icones');

// ─── leitura do YAML ──────────────────────────────────────────────────────────

const root = resolve('.');
let doc;
try {
  doc = yaml.load(readFileSync(resolve(yamlPath), 'utf8'));
} catch (e) {
  console.error(`Erro ao ler YAML: ${e.message}`);
  process.exit(1);
}

const servicos = doc.servicos ?? [];

// ─── layout automático ───────────────────────────────────────────────────────

// Distribuição em grade: máximo 4 colunas
const COLUNAS     = Math.min(4, servicos.length);
const LARGURA_NO  = 130;
const ALTURA_NO   = 110;
const PAD_X       = 60;
const PAD_Y       = 80;
const GAP_X       = 60;
const GAP_Y       = 80;
const ICONE_W     = 48;
const ICONE_H     = 48;

const linhas = Math.ceil(servicos.length / COLUNAS);

const W_TOTAL = PAD_X * 2 + COLUNAS * LARGURA_NO + (COLUNAS - 1) * GAP_X;
const H_TOTAL = PAD_Y * 2 + linhas  * ALTURA_NO  + (linhas  - 1) * GAP_Y + 80; // +80 para título

// Posição de cada serviço (centro do nó)
const posicoes = {};
servicos.forEach((svc, i) => {
  const col = i % COLUNAS;
  const lin = Math.floor(i / COLUNAS);
  posicoes[svc.id] = {
    cx: PAD_X + col * (LARGURA_NO + GAP_X) + LARGURA_NO / 2,
    cy: 80 + PAD_Y + lin * (ALTURA_NO + GAP_Y) + ALTURA_NO / 2,
  };
});

// ─── paleta de cores ─────────────────────────────────────────────────────────

const COR = {
  fundo:       '#0f1117',
  superficie:  '#1a1d27',
  borda:       '#2a2d3e',
  bordaGrupo:  '#3a3d4e',
  primaria:    '#6c63ff',
  texto:       '#e2e8f0',
  textoMuted:  '#94a3b8',
  seta:        '#6c63ff',
  setaDash:    '#f59e0b',
  rotulo:      '#cbd5e1',
  caixaNo:     '#1e2130',
  labelBg:     'rgba(15,17,23,0.85)',
};

// ─── helpers SVG ─────────────────────────────────────────────────────────────

function escXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parte da borda do nó mais próxima de um ponto externo (cx2,cy2) */
function bordaNoPonto(id, cx2, cy2) {
  const { cx, cy } = posicoes[id];
  const hw = LARGURA_NO / 2;
  const hh = ALTURA_NO  / 2;
  const dx = cx2 - cx;
  const dy = cy2 - cy;
  // Intersecção com o retângulo
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale  = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

// ─── renderização das setas ───────────────────────────────────────────────────

let svgSetas = '';
let svgRotulos = '';

for (const svc of servicos) {
  if (!svc.conexoes) continue;
  for (const conn of svc.conexoes) {
    if (!posicoes[conn.destino]) continue;

    const { cx: cx1, cy: cy1 } = posicoes[svc.id];
    const { cx: cx2, cy: cy2 } = posicoes[conn.destino];

    const p1 = bordaNoPonto(svc.id,     cx2, cy2);
    const p2 = bordaNoPonto(conn.destino, cx1, cy1);

    const dash  = conn.estilo === 'tracejado' ? 'stroke-dasharray="8 4"' : '';
    const color = conn.estilo === 'tracejado' ? COR.setaDash : COR.seta;

    // Curva de Bezier suave
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 - 20;

    svgSetas += `
      <path d="M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}"
            fill="none" stroke="${color}" stroke-width="1.8"
            ${dash}
            marker-end="url(#arrow${conn.estilo === 'tracejado' ? 'Dash' : ''})" />`;

    if (conn.rotulo) {
      const lx = (p1.x + p2.x) / 2;
      const ly = (p1.y + p2.y) / 2 - 22;
      const passo = conn.passo ? `<tspan fill="${COR.primaria}" font-weight="bold">➤${conn.passo} </tspan>` : '';
      svgRotulos += `
        <rect x="${lx - 36}" y="${ly - 10}" width="72" height="16" rx="4"
              fill="${COR.labelBg}" />
        <text x="${lx}" y="${ly + 2}" text-anchor="middle"
              font-family="Segoe UI, system-ui, sans-serif" font-size="9"
              fill="${COR.rotulo}">${passo}${escXml(conn.rotulo)}</text>`;
    }
  }
}

// ─── renderização dos nós ────────────────────────────────────────────────────

let svgNos = '';

for (const svc of servicos) {
  const { cx, cy } = posicoes[svc.id];
  const x  = cx - LARGURA_NO / 2;
  const y  = cy - ALTURA_NO  / 2;

  // Tenta carregar o ícone como SVG inline; fallback para placeholder
  const icoFile = join(iconsDir, svc.icone ?? '');
  let   icoSvg  = '';

  if (svc.icone && existsSync(icoFile) && extname(icoFile).toLowerCase() === '.svg') {
    try {
      // Extrair o conteúdo interno do SVG e colocá-lo em <g transform>
      const raw = readFileSync(icoFile, 'utf8');
      const inner = raw.replace(/<\?xml[^>]*\?>/g, '')
                       .replace(/<!DOCTYPE[^>]*>/g, '')
                       .replace(/<svg[^>]*>/, '')
                       .replace(/<\/svg>/, '');
      const ix = cx - ICONE_W / 2;
      const iy = cy - ALTURA_NO / 2 + 12;
      icoSvg = `<g transform="translate(${ix},${iy}) scale(${ICONE_W / 100})">${inner}</g>`;
    } catch (_) {}
  }

  if (!icoSvg) {
    // Placeholder colorido com inicial
    const inicial = (svc.nome ?? svc.id).charAt(0).toUpperCase();
    const ix = cx - ICONE_W / 2;
    const iy = cy - ALTURA_NO / 2 + 12;
    icoSvg = `
      <rect x="${ix}" y="${iy}" width="${ICONE_W}" height="${ICONE_H}"
            rx="8" fill="${COR.primaria}" opacity="0.25" />
      <text x="${cx}" y="${iy + ICONE_H / 2 + 6}"
            text-anchor="middle" font-size="22" font-weight="bold"
            fill="${COR.primaria}" font-family="Segoe UI, system-ui, sans-serif"
            >${escXml(inicial)}</text>`;
  }

  // Linha divisória
  const divY = cy - ALTURA_NO / 2 + 12 + ICONE_H + 8;

  // Texto do nome (quebra em 2 linhas se longo)
  const nomeCompleto = svc.nome ?? svc.id;
  const partes = quebrarTexto(nomeCompleto, 18);
  const nomeLines = partes.map((parte, i) =>
    `<tspan x="${cx}" dy="${i === 0 ? 0 : 13}">${escXml(parte)}</tspan>`
  ).join('');

  const nomeY = divY + 16;

  svgNos += `
    <g class="no" id="no-${escXml(svc.id)}">
      <!-- caixa -->
      <rect x="${x}" y="${y}" width="${LARGURA_NO}" height="${ALTURA_NO}"
            rx="10" fill="${COR.caixaNo}"
            stroke="${COR.borda}" stroke-width="1.2" />
      <!-- ícone -->
      ${icoSvg}
      <!-- linha divisória -->
      <line x1="${x + 10}" y1="${divY}" x2="${x + LARGURA_NO - 10}" y2="${divY}"
            stroke="${COR.borda}" stroke-width="0.8" />
      <!-- nome -->
      <text x="${cx}" y="${nomeY}"
            text-anchor="middle"
            font-family="Segoe UI, system-ui, sans-serif"
            font-size="10" fill="${COR.texto}" font-weight="500">
        ${nomeLines}
      </text>
    </g>`;
}

// ─── cabeçalho / título ───────────────────────────────────────────────────────

const titulo   = escXml(doc.nome ?? 'Diagrama de Arquitetura AWS');
const subtitulo = escXml(doc.descricao?.trim().replace(/\s+/g, ' ').slice(0, 90) + (doc.descricao?.length > 90 ? '…' : '') ?? '');
const regiao   = escXml(doc.regiao ?? '');

// ─── montagem do SVG final ────────────────────────────────────────────────────

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${W_TOTAL}" height="${H_TOTAL}"
     viewBox="0 0 ${W_TOTAL} ${H_TOTAL}">

  <!-- defs -->
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8"
            refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="${COR.seta}" />
    </marker>
    <marker id="arrowDash" markerWidth="8" markerHeight="8"
            refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="${COR.setaDash}" />
    </marker>
  </defs>

  <!-- fundo -->
  <rect width="${W_TOTAL}" height="${H_TOTAL}" fill="${COR.fundo}" />

  <!-- borda aws cloud -->
  <rect x="20" y="70" width="${W_TOTAL - 40}" height="${H_TOTAL - 90}"
        rx="12" fill="none"
        stroke="${COR.bordaGrupo}" stroke-width="1.5" stroke-dasharray="6 3" />
  <rect x="20" y="60" width="130" height="18" rx="4" fill="${COR.fundo}" />
  <text x="30" y="73"
        font-family="Segoe UI, system-ui, sans-serif" font-size="11"
        fill="${COR.textoMuted}" font-weight="600">
    ☁ AWS Cloud ${regiao ? `(${regiao})` : ''}
  </text>

  <!-- título -->
  <text x="${W_TOTAL / 2}" y="32"
        text-anchor="middle"
        font-family="Segoe UI, system-ui, sans-serif"
        font-size="16" font-weight="700" fill="${COR.texto}">${titulo}</text>
  <text x="${W_TOTAL / 2}" y="52"
        text-anchor="middle"
        font-family="Segoe UI, system-ui, sans-serif"
        font-size="10" fill="${COR.textoMuted}">${subtitulo}</text>

  <!-- setas (atrás dos nós) -->
  ${svgSetas}

  <!-- rótulos das setas -->
  ${svgRotulos}

  <!-- nós -->
  ${svgNos}

  <!-- rodapé -->
  <text x="${W_TOTAL - 16}" y="${H_TOTAL - 10}"
        text-anchor="end"
        font-family="Segoe UI, system-ui, sans-serif"
        font-size="9" fill="${COR.textoMuted}">
    Gerado por render.mjs · Workshop Kiro e Agentes na AWS · LAB365 × SENAI
  </text>
</svg>`;

// ─── utilitário: quebra texto em linhas ──────────────────────────────────────

function quebrarTexto(texto, maxChars) {
  const palavras = texto.split(' ');
  const linhas   = [];
  let   atual    = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > maxChars && atual) {
      linhas.push(atual.trim());
      atual = p;
    } else {
      atual = (atual + ' ' + p).trim();
    }
  }
  if (atual) linhas.push(atual.trim());
  return linhas.slice(0, 2); // máximo 2 linhas
}

// ─── saída ───────────────────────────────────────────────────────────────────

// Tenta converter para PNG via sharp; fallback para SVG
const outResolvido = resolve(outPath);

try {
  const sharp = require('sharp');
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outResolvido);
  console.log(`✔ PNG gerado: ${outPath}`);
} catch (e) {
  // sharp não disponível: salva como SVG com extensão .svg
  const svgOut = outResolvido.replace(/\.png$/i, '.svg');
  writeFileSync(svgOut, svg, 'utf8');
  console.log(`⚠ sharp não disponível — SVG gerado: ${svgOut.replace(resolve('.') + '/', '')}`);
  console.log('  Para gerar PNG: npm install sharp');
}
