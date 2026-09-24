/**
 * icones.mjs — Carregamento de ícones SVG oficiais AWS.
 *
 * Responsabilidades:
 *   - Ler SVG da pasta icones/
 *   - Extrair viewBox real (não assume 80×80)
 *   - Prefixar ids internos e referências para evitar colisão entre ícones
 *   - Extrair cor de faixa do ícone (fallback para CATEGORIA_COR)
 *
 * Exporta:
 *   extrairViewBox(svgStr)                     → { w, h }
 *   prefixarIds(svgStr, prefixo)               → svgStr
 *   extrairCorFaixa(svgStr)                    → hex | null
 *   carregarIcone(filename, idServico, iconsDir) → IconeCarregado | null
 *   carregarTodos(servicos, iconsDir)           → Map<id, IconeCarregado>
 *   categoryCor(tipo)                          → hex
 */

import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

// ─── Mapa de cor por categoria (fallback quando não há ícone) ─────────────────

export const CATEGORIA_COR = {
  'aws-api-gateway':       '#8C4FFF',
  'aws-cognito':           '#DD344C',
  'aws-agentcore-runtime': '#ED7100',
  'aws-bedrock':           '#01A88D',
  'aws-s3':                '#7AA116',
  'aws-opensearch':        '#7AA116',
  'aws-lambda':            '#ED7100',
  'aws-cloudfront':        '#8C4FFF',
  'aws-dynamodb':          '#527FFF',
  'aws-ecs':               '#ED7100',
  'aws-fargate':           '#ED7100',
  'aws-ec2':               '#ED7100',
  'aws-rds':               '#527FFF',
  'aws-sqs':               '#ED7100',
  'aws-sns':               '#ED7100',
  'aws-iam':               '#DD344C',
  'aws-vpc':               '#8C4FFF',
  'aws-alb':               '#8C4FFF',
  'aws-eventbridge':       '#ED7100',
  'aws-step-functions':    '#ED7100',
  'aws-kinesis':           '#ED7100',
  'aws-glue':              '#7AA116',
  'aws-athena':            '#527FFF',
  'aws-redshift':          '#527FFF',
  'aws-emr':               '#7AA116',
  'usuarios':              '#546E7A',
};

export function categoryCor(tipo) {
  return CATEGORIA_COR[tipo] ?? '#232F3E';
}

// ─── extrairViewBox ────────────────────────────────────────────────────────────

/**
 * Extrai as dimensões do viewBox de uma string SVG.
 * Suporta formatos: "0 0 80 80", "0 0 64 64", etc.
 * Fallback para 80×80 se não encontrar.
 *
 * @param {string} svgStr
 * @returns {{ w: number, h: number }}
 */
export function extrairViewBox(svgStr) {
  const m = svgStr.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!m) return { w: 80, h: 80 };
  const partes = m[1].trim().split(/\s+/);
  if (partes.length < 4) return { w: 80, h: 80 };
  const w = parseFloat(partes[2]);
  const h = parseFloat(partes[3]);
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return { w: 80, h: 80 };
  return { w, h };
}

// ─── prefixarIds ──────────────────────────────────────────────────────────────

/**
 * Prefixa todos os ids internos de um fragmento SVG e suas referências.
 * Evita colisões quando múltiplos ícones são embutidos no mesmo SVG.
 *
 * Substitui:
 *   id="X"        → id="<prefixo>-X"
 *   url(#X)       → url(#<prefixo>-X)
 *   href="#X"     → href="#<prefixo>-X"
 *   xlink:href="#X" → xlink:href="#<prefixo>-X"
 *
 * @param {string} svgStr
 * @param {string} prefixo   id do serviço (ex: "agentcore")
 * @returns {string}
 */
export function prefixarIds(svgStr, prefixo) {
  // Sanitizar prefixo para uso seguro em regex e atributos
  const p = prefixo.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Coletar todos os ids existentes antes de substituir
  const idsEncontrados = new Set();
  const reId = /\bid="([^"]+)"/g;
  let m;
  while ((m = reId.exec(svgStr)) !== null) {
    idsEncontrados.add(m[1]);
  }

  if (idsEncontrados.size === 0) return svgStr;

  let resultado = svgStr;

  // Substituir declarações id="X" → id="p-X"
  resultado = resultado.replace(/\bid="([^"]+)"/g, (_, id) => `id="${p}-${id}"`);

  // Substituir referências url(#X) → url(#p-X)
  resultado = resultado.replace(/url\(#([^)]+)\)/g, (_, id) => {
    if (idsEncontrados.has(id)) return `url(#${p}-${id})`;
    return `url(#${id})`;
  });

  // Substituir href="#X" e xlink:href="#X"
  resultado = resultado.replace(/(xlink:)?href="#([^"]+)"/g, (full, xl, id) => {
    if (idsEncontrados.has(id)) return `${xl || ''}href="#${p}-${id}"`;
    return full;
  });

  return resultado;
}

// ─── extrairCorFaixa ──────────────────────────────────────────────────────────

/**
 * Extrai a cor de fundo principal do SVG do ícone.
 * Estratégia: primeiro <rect> ou <path> com fill sólido e área significativa.
 * Retorna null se não encontrar.
 *
 * @param {string} svgStr
 * @returns {string|null}  hex color ou null
 */
export function extrairCorFaixa(svgStr) {
  // Procura fill em elementos que provavelmente são o fundo do ícone
  // Excluir fill="none", fill="white", fill="#ffffff", fill="#FFFFFF"
  const resFill = svgStr.match(
    /fill="(#[0-9A-Fa-f]{3,6}|rgb\([^)]+\))"/
  );
  if (!resFill) return null;

  const cor = resFill[1].toLowerCase();
  // Ignorar branco, preto e transparente
  const ignorar = new Set(['#fff', '#ffffff', '#000', '#000000', 'none', 'transparent']);
  if (ignorar.has(cor)) {
    // Tentar o segundo match
    const todos = [...svgStr.matchAll(/fill="(#[0-9A-Fa-f]{3,6})"/g)]
      .map(m => m[1].toLowerCase())
      .filter(c => !ignorar.has(c));
    return todos[0] ?? null;
  }

  return cor;
}

// ─── carregarIcone ────────────────────────────────────────────────────────────

/**
 * @typedef {object} IconeCarregado
 * @property {string} inner      fragmento SVG interno (sem tags <svg>)
 * @property {number} escala     fator de escala para atingir ICON_SIZE
 * @property {number} viewBoxW   largura original do viewBox
 * @property {number} viewBoxH   altura original do viewBox
 * @property {string|null} corFaixa  cor extraída do ícone, ou null
 */

/**
 * Carrega um ícone SVG da pasta de ícones, extrai seu conteúdo e métricas.
 *
 * @param {string} filename       nome do arquivo (ex: "Arch_Amazon-Bedrock_64.svg")
 * @param {string} idServico      id do serviço (usado como prefixo de ids)
 * @param {string} iconsDir       caminho absoluto da pasta de ícones
 * @param {number} [iconSize=64]  tamanho alvo em pixels
 * @returns {IconeCarregado|null}
 */
export function carregarIcone(filename, idServico, iconsDir, iconSize = 64) {
  if (!filename || filename === '') return null;

  const caminho = join(iconsDir, filename);
  if (!existsSync(caminho)) return null;
  if (extname(caminho).toLowerCase() !== '.svg') return null;

  let raw;
  try {
    raw = readFileSync(caminho, 'utf8');
  } catch {
    return null;
  }

  // Extrair viewBox antes de qualquer modificação
  const { w: viewBoxW, h: viewBoxH } = extrairViewBox(raw);

  // Extrair cor de faixa do SVG original
  const corFaixa = extrairCorFaixa(raw);

  // Remover declarações XML/DOCTYPE e tags SVG externas
  let inner = raw
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/<svg[^>]*>/,  '')
    .replace(/<\/svg\s*>/g, '')
    .trim();

  // Prefixar ids para evitar colisões
  inner = prefixarIds(inner, idServico);

  const escala = iconSize / viewBoxW;

  return { inner, escala, viewBoxW, viewBoxH, corFaixa };
}

// ─── carregarTodos ────────────────────────────────────────────────────────────

/**
 * Carrega todos os ícones dos serviços de um documento.
 *
 * @param {Array}  servicos
 * @param {string} iconsDir
 * @param {number} [iconSize=64]
 * @returns {Map<string, IconeCarregado|null>}  mapa id → IconeCarregado | null
 */
export function carregarTodos(servicos, iconsDir, iconSize = 64) {
  const mapa = new Map();
  for (const svc of servicos) {
    mapa.set(svc.id, carregarIcone(svc.icone ?? '', svc.id, iconsDir, iconSize));
  }
  return mapa;
}
