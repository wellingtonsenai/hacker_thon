"""Tipos essenciais do padrão LAB365: capa, seção, conteúdo, cards, processo, números, comparação, citação, fechamento."""

from __future__ import annotations

from slides import base as b
from slides.esquema import COR, Icone, Imagem, Lista, Nota, Objeto, Texto
from slides.tipos import registrar


def _inicio(ctx, d):
    s = ctx.novo_slide("conteudo")
    b.cabecalho(s, ctx.eyebrow(d), d.get("titulo", ""))
    return s


# ── Estrutura ─────────────────────────────────────────────────────────────────

@registrar("capa", categoria="abertura", descricao="Primeiro slide: título, subtítulo e autor sobre o fundo em ondas.",
           campos={"titulo": Texto(40), "subtitulo": Texto(90, False), "autor": Texto(70, False)},
           exemplo={"titulo": "Energia solar no Brasil", "subtitulo": "Como o sol virou a fonte que mais cresce no país",
                    "autor": "Grupo 1  ·  LAB365 × SENAI"})
def capa(ctx, d):
    s = ctx.novo_slide("capa")
    b.titulo(s, d["titulo"], 0.8, 1.95, 8.4, 0.8, estilo="titulo_capa", alinh="c", minimo=20)
    if d.get("subtitulo"):
        b.texto(s, 0.8, 2.8, 8.4, 0.4, d["subtitulo"], estilo="subtitulo_capa", alinh="c", max_linhas=1)
    if d.get("autor"):
        b.texto(s, 0.8, 3.3, 8.4, 0.3, d["autor"], estilo="autor_capa", alinh="c", max_linhas=1)


@registrar("secao", categoria="abertura", descricao="Divide o deck em partes (fundo gradiente). Ícone e selo opcionais.",
           campos={"titulo": Texto(36), "subtitulo": Texto(80, False), "icone": Icone(), "selo": Texto(24, False)},
           exemplo={"titulo": "Bloco 1: o recurso", "subtitulo": "Por que o sol é a fonte mais abundante", "icone": "sun"})
def secao(ctx, d):
    s = ctx.novo_slide("secao")
    if d.get("icone"):
        b.icone_circulo(s, d["icone"], 4.525, 0.825, 0.95, fundo="branco", cor_icone="roxo")
    b.titulo(s, d["titulo"], 1.0, 2.05, 8.0, 0.75, estilo="titulo_secao", alinh="c", minimo=20)
    if d.get("subtitulo"):
        b.texto(s, 1.0, 2.85, 8.0, 0.4, d["subtitulo"], estilo="subtitulo_secao", alinh="c", max_linhas=1)
    if d.get("selo"):
        w = b.largura_pill(d["selo"], 10) + 0.3
        b.pill(s, 5 - w / 2, 3.42, w, 0.36, d["selo"], preench="branco", cor_texto="roxo", tam=10)


@registrar("fechamento", categoria="abertura", descricao="Último slide de conteúdo: mensagem final e até 3 números de impacto.",
           campos={"titulo": Texto(36), "subtitulo": Texto(90, False),
                   "numeros": Lista(Objeto({"valor": Texto(7), "rotulo": Texto(30)}), 0, 3, False)},
           exemplo={"titulo": "Obrigado!", "subtitulo": "Perguntas?", "numeros": [{"valor": "90%", "rotulo": "queda de custo desde 2010"}]})
def fechamento(ctx, d):
    s = ctx.novo_slide("secao")
    nums = d.get("numeros") or []
    y = 1.6 if nums else 2.05
    b.titulo(s, d["titulo"], 1.0, y, 8.0, 0.75, estilo="titulo_secao", alinh="c", minimo=20)
    if d.get("subtitulo"):
        b.texto(s, 1.0, y + 0.8, 8.0, 0.4, d["subtitulo"], estilo="subtitulo_secao", alinh="c", max_linhas=1)
    for (x, w), n in zip(b.distribuir(len(nums), 1.5, 7.0, 0.3), nums):
        b.texto(s, x, 3.2, w, 0.7, n["valor"], tam=36, negrito=True, cor="branco", alinh="c", max_linhas=1)
        b.texto(s, x, 3.9, w, 0.5, n["rotulo"], tam=11, cor="branco", alinh="c", max_linhas=2)


@registrar("encerramento", categoria="abertura", descricao="Slide final só com os logos LAB365 e SENAI.", campos={}, exemplo={})
def encerramento(ctx, d):
    ctx.novo_slide("encerramento")


# ── Conteúdo ──────────────────────────────────────────────────────────────────

ITEM_CARD = Objeto({"icone": Icone(True), "rotulo": Texto(22, False), "titulo": Texto(30), "texto": Texto(90), "cor": COR})


@registrar("cards", descricao="2 a 6 cards com ícone, rótulo, título e texto. O layout mais versátil.",
           campos={"titulo": Texto(40), "itens": Lista(ITEM_CARD, 2, 6), "nota": Nota()},
           exemplo={"titulo": "Os três pilares", "itens": [
               {"icone": "sun", "rotulo": "Fonte", "titulo": "Radiação solar", "texto": "Energia abundante e gratuita todos os dias."},
               {"icone": "zap", "rotulo": "Conversão", "titulo": "Painel fotovoltaico", "texto": "Transforma luz em eletricidade."},
               {"icone": "battery-charging", "rotulo": "Uso", "titulo": "Armazenamento", "texto": "Baterias guardam o excedente."}],
               "nota": "Resumo: fonte, conversão e uso formam o sistema."})
def cards(ctx, d):
    s = _inicio(ctx, d)
    itens = d["itens"]
    topo, fim = b.area_conteudo(bool(d.get("nota")))
    col = {2: 2, 3: 3, 4: 2, 5: 5, 6: 3}[len(itens)]
    for i, ((x, y, w, h), it) in enumerate(zip(b.grade(len(itens), col, b.MX, topo, b.LU, fim - topo, 0.2, 0.2), itens)):
        a = b.acento_item(it, i)
        b.card(s, x, y, w, h, preench=a.suave)
        estreito = w < 2.5
        d_ic = 0.6
        b.icone_circulo(s, it["icone"], x + 0.2, y + 0.2, d_ic, fundo=a.forte)
        tx, ty, tw = (x + 0.2, y + 0.95, w - 0.4) if estreito else (x + 0.95, y + 0.22, w - 1.15)
        if it.get("rotulo"):
            b.texto(s, tx, ty, tw, 0.22, it["rotulo"], estilo="rotulo", cor=a.tinta, max_linhas=1)
            ty += 0.22
        b.texto(s, tx, ty, tw, 0.34, it["titulo"], estilo="titulo_card", max_linhas=1, minimo=9)
        cy = max(ty + 0.42, y + 0.95) if not estreito else ty + 0.42
        b.texto(s, x + 0.2 if not estreito else tx, cy, w - 0.4, y + h - cy - 0.15, it["texto"], estilo="corpo")
    b.nota(s, d.get("nota"))


@registrar("conteudo", descricao="Título e até 6 tópicos, cada um com ícone. Para listas simples.",
           campos={"titulo": Texto(40), "bullets": Lista(Texto(90), 2, 6), "icone": Icone(), "nota": Nota()},
           exemplo={"titulo": "Por que energia solar?", "bullets": ["Fonte renovável e inesgotável", "Emissão zero na operação",
                    "Custo caiu 90% desde 2010"], "icone": "circle-check"})
def conteudo(ctx, d):
    s = _inicio(ctx, d)
    topo, fim = b.area_conteudo(bool(d.get("nota")))
    n = len(d["bullets"])
    h = min(0.62, (fim - topo - 0.1 * (n - 1)) / n)
    for i, txt in enumerate(d["bullets"]):
        a = b.acento(i)
        y = topo + i * (h + 0.1)
        b.card(s, b.MX, y, b.LU, h, preench="fundo_neutro", raio=b.RAIO_LINHA)
        dc = h - 0.16
        b.icone_circulo(s, d.get("icone") or "circle-check", b.MX + 0.12, y + 0.08, dc, fundo=a.suave, cor_icone=a.tinta)
        b.texto(s, b.MX + 0.3 + dc, y, b.LU - 0.5 - dc, h, txt, estilo="corpo_grande", ancora="m", max_linhas=2)
    b.nota(s, d.get("nota"))


@registrar("processo", descricao="Fluxo de 3 a 6 etapas em setas (chevrons) com ícone acima e texto abaixo.",
           campos={"titulo": Texto(40), "etapas": Lista(Objeto({"icone": Icone(True), "titulo": Texto(16), "texto": Texto(50), "cor": COR}), 3, 6),
                   "nota": Nota()},
           exemplo={"titulo": "Da luz à tomada", "etapas": [
               {"icone": "sun", "titulo": "Captação", "texto": "Painéis recebem a luz"},
               {"icone": "zap", "titulo": "Conversão", "texto": "Inversor gera corrente alternada"},
               {"icone": "plug", "titulo": "Consumo", "texto": "Energia chega à casa"}]})
def processo(ctx, d):
    s = _inicio(ctx, d)
    et = d["etapas"]
    n = len(et)
    passo = (b.LU + 0.07 * (n - 1)) / n
    w = passo + 0.0
    y0 = 2.0 if d.get("nota") else 2.3
    for i, e in enumerate(et):
        a = b.acento_item(e, i)
        x = b.MX + i * (passo - 0.07)
        b.forma(s, "seta" if i == 0 else "chevron", x, y0 + 0.73, w - 0.0, 0.62, preench=a.forte, adj=[0.28])
        b.texto(s, x + 0.2, y0 + 0.73, w - 0.4, 0.62, f"{i + 1:02d}", tam=14, negrito=True, cor="branco", alinh="c", ancora="m")
        b.icone_circulo(s, e["icone"], x + w / 2 - 0.28, y0, 0.56, fundo=a.suave, cor_icone=a.tinta)
        b.texto(s, x + 0.08, y0 + 1.5, w - 0.16, 0.28, e["titulo"], tam=11.5, negrito=True, cor="texto", alinh="c", max_linhas=1)
        b.texto(s, x + 0.1, y0 + 1.82, w - 0.2, 0.55, e["texto"], tam=9.5, espac=1.05, alinh="c")
    b.nota(s, d.get("nota"))


@registrar("numeros", descricao="2 a 4 números de destaque em anéis coloridos, com legenda e fonte.",
           campos={"titulo": Texto(40), "itens": Lista(Objeto({"valor": Texto(6), "rotulo": Texto(60), "fonte": Texto(40, False), "cor": COR}), 2, 4),
                   "nota": Nota()},
           exemplo={"titulo": "O que os números dizem", "itens": [
               {"valor": "90%", "rotulo": "queda no custo dos painéis desde 2010", "fonte": "IRENA, 2023"},
               {"valor": "25", "rotulo": "anos de vida útil de um painel"}]})
def numeros(ctx, d):
    s = _inicio(ctx, d)
    its = d["itens"]
    dm = 1.35
    for i, ((x, w), it) in enumerate(zip(b.distribuir(len(its), b.MX, b.LU, 0.3), its)):
        a = b.acento_item(it, i)
        cx = x + w / 2
        b.circulo(s, cx - dm / 2, 1.45, dm, borda=a.forte, borda_larg=7)
        b.texto(s, cx - dm / 2 + 0.1, 1.45, dm - 0.2, dm, it["valor"], tam=26, negrito=True, cor=a.tinta, alinh="c", ancora="m", max_linhas=1)
        b.texto(s, x + 0.2, 2.98, w - 0.4, 0.55, it["rotulo"], tam=10, alinh="c", max_linhas=3)
        if it.get("fonte"):
            b.texto(s, x + 0.2, 3.58, w - 0.4, 0.25, it["fonte"], tam=8, cor="texto_suave", alinh="c", max_linhas=1)
    b.nota(s, d.get("nota"))


LADO = Objeto({"icone": Icone(True), "rotulo": Texto(22, False), "titulo": Texto(30),
               "itens": Lista(Objeto({"chave": Texto(14), "valor": Texto(42)}), 2, 5)})


@registrar("comparacao", descricao="Duas colunas lado a lado (opção A x opção B), cada uma com linhas chave/valor.",
           campos={"titulo": Texto(40), "esquerda": LADO, "direita": LADO, "separador": Texto(3, False), "nota": Nota()},
           exemplo={"titulo": "Fotovoltaica x térmica", "separador": "x",
                    "esquerda": {"icone": "zap", "rotulo": "Eletricidade", "titulo": "Fotovoltaica",
                                 "itens": [{"chave": "Gera", "valor": "energia elétrica"}, {"chave": "Eficiência", "valor": "15 a 23%"}]},
                    "direita": {"icone": "thermometer-sun", "rotulo": "Calor", "titulo": "Térmica",
                                "itens": [{"chave": "Gera", "valor": "água quente"}, {"chave": "Custo", "valor": "mais baixo"}]}})
def comparacao(ctx, d):
    s = _inicio(ctx, d)
    topo, fim = b.area_conteudo(bool(d.get("nota")))
    w = 4.43
    for lado, x, a in ((d["esquerda"], b.MX, b.acento("azul")), (d["direita"], b.MX + b.LU - w, b.acento("magenta"))):
        b.card(s, x, topo, w, fim - topo, preench=a.suave)
        b.icone_circulo(s, lado["icone"], x + 0.2, topo + 0.17, 0.6, fundo=a.forte)
        if lado.get("rotulo"):
            b.texto(s, x + 0.95, topo + 0.22, w - 1.1, 0.22, lado["rotulo"], estilo="rotulo", cor=a.tinta, max_linhas=1)
        b.texto(s, x + 0.95, topo + 0.44, w - 1.1, 0.32, lado["titulo"], estilo="titulo_card", max_linhas=1)
        its = lado["itens"]
        hl = min(0.46, (fim - topo - 1.1) / len(its))
        for j, it in enumerate(its):
            y = topo + 1.0 + j * hl
            b.texto(s, x + 0.3, y, 1.4, hl, it["chave"], tam=9.5, negrito=True, cor=a.tinta, ancora="m", max_linhas=1)
            b.texto(s, x + 1.75, y, w - 1.95, hl, it["valor"], tam=9.5, ancora="m", max_linhas=2)
    b.texto(s, 4.8, (topo + fim) / 2 - 0.2, 0.4, 0.4, d.get("separador") or "x", tam=14, negrito=True, cor="texto_medio", alinh="c", ancora="m")
    b.nota(s, d.get("nota"))


@registrar("citacao", descricao="Frase de impacto em destaque (com fonte) e até 3 cards de apoio abaixo.",
           campos={"titulo": Texto(40), "frase": Texto(140), "fonte": Texto(70, False),
                   "cards": Lista(ITEM_CARD, 0, 3, False), "nota": Nota()},
           exemplo={"titulo": "Por que isso importa", "frase": "A energia solar é a eletricidade mais barata da história.",
                    "fonte": "IEA, World Energy Outlook 2020"})
def citacao(ctx, d):
    s = _inicio(ctx, d)
    cs = d.get("cards") or []
    a = b.acento("roxo")
    h = 1.1 if cs else 2.2
    y = b.TOPO if cs else 2.0
    b.card(s, b.MX, y, b.LU, h, preench=a.suave, raio=0.14)
    b.card(s, b.MX, y, 0.9, h, preench=a.forte, raio=0.14)
    b.forma(s, "ret", b.MX + 0.6, y, 0.3, h, preench=a.forte)
    b.texto(s, b.MX, y, 0.9, h, "“", tam=54, negrito=True, cor="branco", alinh="c", ancora="m")
    par = [[b.Trecho(d["frase"], negrito=True, cor="texto", tam=13 if cs else 18)]]
    if d.get("fonte"):
        par.append([b.Trecho(d["fonte"], negrito=False, cor=a.tinta, tam=9.5 if cs else 11)])
    b.texto(s, b.MX + 1.15, y + 0.12, b.LU - 1.4, h - 0.24, par, ancora="m", espac=1.1, tam=13 if cs else 18)
    if cs:
        topo, fim = b.area_conteudo(bool(d.get("nota")))
        for i, ((x, w), it) in enumerate(zip(b.distribuir(len(cs), b.MX, b.LU, 0.2), cs)):
            ac = b.acento_item(it, i)
            y2 = topo + 1.3
            b.card(s, x, y2, w, fim - y2, preench=ac.suave)
            b.icone_circulo(s, it["icone"], x + 0.2, y2 + 0.18, 0.55, fundo=ac.forte)
            if it.get("rotulo"):
                b.texto(s, x + 0.2, y2 + 0.85, w - 0.4, 0.22, it["rotulo"], estilo="rotulo", cor=ac.tinta, max_linhas=1)
            b.texto(s, x + 0.2, y2 + 1.07, w - 0.4, 0.32, it["titulo"], estilo="titulo_card", max_linhas=1, minimo=9)
            b.texto(s, x + 0.2, y2 + 1.42, w - 0.4, fim - y2 - 1.55, it["texto"], estilo="corpo")
    b.nota(s, d.get("nota"))


@registrar("diagrama", descricao="Imagem (ex.: diagrama de arquitetura) sem distorção, com até 6 passos numerados ao lado.",
           campos={"titulo": Texto(40), "imagem": Imagem(),
                   "passos": Lista(Objeto({"titulo": Texto(24), "texto": Texto(60, False)}), 0, 6, False), "nota": Nota()},
           exemplo={"titulo": "Arquitetura da solução", "imagem": "saida/apostilas-depois.png",
                    "passos": [{"titulo": "Pergunta", "texto": "O aluno envia a dúvida"}, {"titulo": "Resposta", "texto": "O agente responde com fonte"}]})
def diagrama(ctx, d):
    from PIL import Image as PILImage
    s = _inicio(ctx, d)
    topo, fim = b.area_conteudo(bool(d.get("nota")))
    passos = d.get("passos") or []
    area_w = 5.4 if passos else b.LU
    caminho = ctx.resolver_imagem(d["imagem"])
    iw, ih = PILImage.open(caminho).size
    esc = min(area_w / iw, (fim - topo) / ih)
    w, h = iw * esc, ih * esc
    s.shapes.add_picture(str(caminho), b.emu(b.MX + (area_w - w) / 2), b.emu(topo + (fim - topo - h) / 2), b.emu(w), b.emu(h))
    if passos:
        x = b.MX + area_w + 0.3
        pw = b.MX + b.LU - x
        hp = min(0.62, (fim - topo - 0.08 * (len(passos) - 1)) / len(passos))
        for i, p in enumerate(passos):
            a = b.acento(i)
            y = topo + i * (hp + 0.08)
            b.card(s, x, y, pw, hp, preench=a.suave, raio=b.RAIO_LINHA)
            dc = min(0.4, hp - 0.14)
            b.circulo(s, x + 0.12, y + (hp - dc) / 2, dc, preench=a.forte)
            b.texto(s, x + 0.12, y + (hp - dc) / 2, dc, dc, str(i + 1), tam=11, negrito=True, cor="branco", alinh="c", ancora="m")
            tx = x + 0.24 + dc
            par = [[b.Trecho(p["titulo"], negrito=True, cor="texto", tam=10.5)]]
            if p.get("texto"):
                par.append([b.Trecho(p["texto"], tam=9)])
            b.texto(s, tx, y, x + pw - tx - 0.1, hp, par, tam=10.5, ancora="m", espac=1.05)
    b.nota(s, d.get("nota"))
