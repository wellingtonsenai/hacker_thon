/**
 * Rasteriza os ícones Lucide (SVG) em PNG brancos com alpha, usados como
 * máscara pelo gerador de slides (que recolore em Python conforme o token).
 *
 * Uso (uma vez, só para atualizar a biblioteca):
 *   npm i --no-save lucide-static
 *   node slides/ferramentas/gerar_icones.mjs node_modules/lucide-static
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const origem = process.argv[2] ?? 'node_modules/lucide-static';
const destino = process.argv[3] ?? 'slides/icones';
const TAM = 192;

const dirIcones = path.join(origem, 'icons');
const tags = JSON.parse(fs.readFileSync(path.join(origem, 'tags.json'), 'utf8'));
fs.mkdirSync(destino, { recursive: true });

const catalogo = {};
const arquivos = fs.readdirSync(dirIcones).filter((f) => f.endsWith('.svg')).sort();
for (const arq of arquivos) {
  const nome = arq.replace(/\.svg$/, '');
  const svg = fs
    .readFileSync(path.join(dirIcones, arq), 'utf8')
    .replace(/<!--.*?-->/gs, '')
    .replace(/stroke="currentColor"/g, 'stroke="#FFFFFF"')
    .replace(/width="24"/, `width="${TAM}"`)
    .replace(/height="24"/, `height="${TAM}"`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(path.join(destino, `${nome}.png`));
  catalogo[nome] = tags[nome] ?? [];
}
fs.writeFileSync(path.join(destino, 'catalogo.json'), JSON.stringify(catalogo));
console.log(`✔ ${arquivos.length} ícones em ${destino}`);
