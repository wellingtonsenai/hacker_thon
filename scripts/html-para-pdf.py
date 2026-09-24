#!/usr/bin/env python3
"""
html-para-pdf.py
Converte um arquivo HTML de apostila para PDF usando WeasyPrint.

Uso:
    python scripts/html-para-pdf.py <caminho-do-html>

Exemplos:
    python scripts/html-para-pdf.py apostilas/apostila-php-comentarios.html
    python scripts/html-para-pdf.py apostilas/apostila-aws-cloud-computing.html

Saída:
    apostilas/apostila-php-comentarios.pdf  (mesmo nome, extensão .pdf)

Pré-requisito:
    pip install weasyprint
"""

import sys
import os
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print("❌  Uso: python scripts/html-para-pdf.py <caminho-do-html>")
        print("   Exemplo: python scripts/html-para-pdf.py apostilas/apostila-php-comentarios.html")
        sys.exit(1)

    html_path = Path(sys.argv[1]).resolve()

    if not html_path.exists():
        print(f"❌  Arquivo não encontrado: {html_path}")
        sys.exit(1)

    out_path = html_path.with_suffix(".pdf")

    print(f"\n📄  Convertendo : {sys.argv[1]}")
    print(f"📥  Saída       : {out_path.relative_to(Path('.').resolve())}\n")

    try:
        import weasyprint
    except ImportError:
        print("❌  WeasyPrint não encontrado. Execute: pip install weasyprint")
        sys.exit(1)

    # WeasyPrint precisa da URL file:// para resolver recursos relativos
    file_url = html_path.as_uri()

    try:
        doc = weasyprint.HTML(url=file_url).write_pdf(
            stylesheets=[
                # CSS extra apenas para impressão: numera páginas no rodapé
                weasyprint.CSS(string="""
                    @page {
                        size: A4;
                        margin: 15mm 12mm 18mm 12mm;
                        @bottom-center {
                            content: "LAB365 × SENAI · Workshop Kiro & Agentes na AWS";
                            font-family: Arial, sans-serif;
                            font-size: 9px;
                            color: #94A3B8;
                        }
                        @bottom-right {
                            content: "Página " counter(page) " de " counter(pages);
                            font-family: Arial, sans-serif;
                            font-size: 9px;
                            color: #94A3B8;
                        }
                    }

                    /* Garante que blocos de código não sejam cortados no meio */
                    pre { page-break-inside: avoid; }
                    .quiz  { page-break-inside: avoid; }
                    .card  { page-break-inside: avoid; }
                    .step  { page-break-inside: avoid; }
                    section { page-break-before: auto; }

                    /* Remove sombras que podem ficar estranhas no PDF */
                    * { box-shadow: none !important; }
                """)
            ]
        )
        out_path.write_bytes(doc)
        size_kb = out_path.stat().st_size // 1024
        print(f"✅  PDF gerado com sucesso: {out_path.name} ({size_kb} KB)\n")

    except Exception as e:
        print(f"❌  Erro ao gerar PDF: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
