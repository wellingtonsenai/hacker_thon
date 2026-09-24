"""
Preview do PPTX gerado: um PNG por slide + uma prancha com todos.

Requer LibreOffice (soffice) e poppler (pdftoppm). Sem eles, só avisa.

Uso:
    python -m slides.preview saida/<nome>.pptx
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

from PIL import Image


def gerar_preview(pptx: Path, dpi: int = 80, colunas: int = 3) -> Optional[Path]:
    """Exporta saida/<nome>-preview/slide-NN.png e saida/<nome>-preview.png (prancha)."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    pdftoppm = shutil.which("pdftoppm")
    if not soffice or not pdftoppm:
        print("[preview] LibreOffice/pdftoppm não encontrados — abra o .pptx direto no PowerPoint/Google Slides.")
        return None
    pptx = Path(pptx).resolve()
    pasta = pptx.with_name(f"{pptx.stem}-preview")
    pasta.mkdir(exist_ok=True)
    for antigo in pasta.glob("slide-*.png"):
        antigo.unlink()
    with tempfile.TemporaryDirectory() as tmp:
        perfil = Path(tmp) / "perfil-lo"  # perfil próprio: permite vários previews em paralelo
        subprocess.run([soffice, f"-env:UserInstallation={perfil.as_uri()}", "--headless",
                        "--convert-to", "pdf", "--outdir", tmp, str(pptx)],
                       check=True, capture_output=True, timeout=300)
        pdf = Path(tmp) / f"{pptx.stem}.pdf"
        subprocess.run([pdftoppm, "-r", str(dpi), "-png", str(pdf), str(pasta / "slide")], check=True, timeout=300)
    pngs = sorted(pasta.glob("slide-*.png"))
    if not pngs:
        return None
    ims = [Image.open(p).convert("RGB") for p in pngs]
    w, h = ims[0].size
    gap = 12
    linhas = -(-len(ims) // colunas)
    prancha = Image.new("RGB", (colunas * w + (colunas + 1) * gap, linhas * h + (linhas + 1) * gap), "#D9D9DE")
    for i, im in enumerate(ims):
        prancha.paste(im, (gap + (i % colunas) * (w + gap), gap + (i // colunas) * (h + gap)))
    destino = pptx.with_name(f"{pptx.stem}-preview.png")
    prancha.save(destino)
    return destino


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python -m slides.preview saida/<nome>.pptx")
        sys.exit(2)
    r = gerar_preview(Path(sys.argv[1]))
    print(r or "preview indisponível")
