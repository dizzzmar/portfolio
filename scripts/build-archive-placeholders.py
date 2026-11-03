"""Pegatinas de frutas PROVISIONALES para /archive/fruit-stickers/ (dibujos planos hechos con código, no son fotos reales).
Cuando haya fotos de las pegatinas de verdad: sustituye los .webp de assets/archive/fruit-stickers/ (cuadrados, fondo transparente,
recortadas a la forma de la pegatina) y pon "placeholder": false en items.json. Uso: python3 scripts/build-archive-placeholders.py"""
import json, math, os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'archive', 'fruit-stickers')
N = 1200; C = N // 2
CREAM = (255, 246, 228, 255); WHITE = (255, 255, 255, 255)

def sticker(bg, glyph):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([20, 20, N - 21, N - 21], fill=WHITE)             # el borde blanco de la pegatina troquelada
    d.ellipse([70, 70, N - 71, N - 71], fill=bg)
    glyph(d, bg)
    return im.resize((640, 640), Image.LANCZOS)

def circle(d, x, y, r, fill): d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
def leaf(d, x, y, w, h, fill, tilt=-1):
    pts = [(x, y), (x + tilt * w * .5, y - h * .55), (x + tilt * w, y - h), (x + tilt * w * .15, y - h * .35)]
    d.polygon([(x, y), (x + tilt * w * .6, y - h * .1), (x + tilt * w, y - h), (x + tilt * w * .3, y - h * .75)], fill=fill)

def apple(d, bg):
    circle(d, 520, 660, 215, CREAM); circle(d, 680, 660, 215, CREAM); d.rectangle([380, 640, 820, 820], fill=CREAM)
    circle(d, 600, 830, 180, CREAM); d.rectangle([588, 360, 614, 480], fill=CREAM); leaf(d, 618, 450, 190, 120, CREAM, 1)
def orange(d, bg):
    circle(d, 600, 640, 270, CREAM); leaf(d, 600, 390, 200, 120, bg, 1); circle(d, 600, 392, 18, bg)
def lemon(d, bg):
    d.ellipse([330, 470, 870, 770], fill=CREAM); d.polygon([(330, 620), (275, 600), (345, 560)], fill=CREAM); d.polygon([(870, 620), (925, 640), (855, 680)], fill=CREAM)
def pear(d, bg):
    circle(d, 600, 790, 190, CREAM); circle(d, 600, 560, 120, CREAM); d.polygon([(490, 640), (710, 640), (780, 790), (420, 790)], fill=CREAM)
    d.rectangle([590, 360, 612, 450], fill=CREAM); leaf(d, 612, 420, 170, 100, CREAM, 1)
def strawberry(d, bg):
    d.polygon([(360, 520), (840, 520), (700, 840), (600, 930), (500, 840)], fill=CREAM); circle(d, 450, 540, 90, CREAM); circle(d, 750, 540, 90, CREAM); circle(d, 600, 530, 110, CREAM)
    for x, y in [(470, 620), (600, 600), (730, 620), (520, 720), (680, 720), (600, 800)]: d.ellipse([x - 14, y - 22, x + 14, y + 22], fill=bg)
    for a in range(-2, 3): d.polygon([(600, 480), (600 + a * 90 - 40, 420), (600 + a * 90 + 40, 420)], fill=bg)
def cherry(d, bg):
    circle(d, 480, 810, 150, CREAM); circle(d, 730, 790, 150, CREAM)
    d.line([(500, 670), (610, 420)], fill=CREAM, width=26); d.line([(725, 650), (610, 420)], fill=CREAM, width=26); leaf(d, 612, 430, 230, 90, CREAM, 1)
def watermelon(d, bg):
    d.pieslice([280, 300, 920, 940], 0, 180, fill=CREAM); d.pieslice([340, 360, 860, 880], 0, 180, fill=(255, 120, 150, 255))
    for x, y in [(480, 560), (600, 620), (720, 560), (540, 700), (660, 700)]: d.ellipse([x - 14, y - 26, x + 14, y + 26], fill=bg)
def banana(d, bg):
    R, r, cx, cy = 360, 230, 600, 380
    pts = [(cx + R * math.cos(math.pi * (.12 + .76 * i / 40)), cy + R * math.sin(math.pi * (.12 + .76 * i / 40))) for i in range(41)]
    inner = [(cx + r * math.cos(math.pi * (.12 + .76 * i / 40)), cy + (r + 40) * math.sin(math.pi * (.12 + .76 * i / 40))) for i in range(40, -1, -1)]
    d.polygon(pts + inner, fill=CREAM)
def grapes(d, bg):
    for row, n in enumerate([4, 3, 3, 2, 1]):
        for i in range(n): circle(d, 600 + (i - (n - 1) / 2) * 150, 470 + row * 120, 80, CREAM)
    d.rectangle([590, 330, 612, 420], fill=CREAM); leaf(d, 612, 400, 190, 100, CREAM, 1)
def kiwi(d, bg):
    circle(d, 600, 600, 290, CREAM); circle(d, 600, 600, 235, bg); circle(d, 600, 600, 70, CREAM)
    for k in range(14): a = k / 14 * 2 * math.pi; d.ellipse([600 + 150 * math.cos(a) - 12, 600 + 150 * math.sin(a) - 20, 600 + 150 * math.cos(a) + 12, 600 + 150 * math.sin(a) + 20], fill=CREAM)
def lime(d, bg):
    circle(d, 600, 600, 290, CREAM); circle(d, 600, 600, 245, bg)
    for k in range(8): a = k / 8 * 2 * math.pi + .2; d.line([(600, 600), (600 + 245 * math.cos(a), 600 + 245 * math.sin(a))], fill=CREAM, width=22)
    circle(d, 600, 600, 40, CREAM)
def peach(d, bg):
    circle(d, 600, 640, 270, CREAM); d.arc([470, 400, 730, 880], 250, 110, fill=bg, width=26); leaf(d, 604, 395, 210, 130, CREAM, 1); d.rectangle([594, 370, 612, 420], fill=CREAM)

SET = [('Orange', (255, 122, 26), orange), ('Apple', (232, 50, 43), apple), ('Lemon', (31, 157, 85), lemon), ('Pear', (127, 184, 0), pear),
       ('Strawberry', (232, 51, 122), strawberry), ('Cherry', (194, 24, 91), cherry), ('Watermelon', (0, 169, 157), watermelon),
       ('Banana', (47, 111, 237), banana), ('Grapes', (106, 63, 181), grapes), ('Kiwi', (255, 90, 138), kiwi), ('Lime', (245, 163, 0), lime), ('Peach', (11, 138, 106), peach)]
items = []
for i, (name, bg, g) in enumerate(SET, 1):
    f = f'sticker-{i:02d}.webp'
    sticker(bg + (255,), g).save(os.path.join(OUT, f), 'WEBP', quality=88, method=6)
    items.append({'id': f'sticker-{i:02d}', 'name': f'{name} sticker', 'src': f, 'facts': [['Category', 'Fruit sticker']]})
json.dump({'collection': 'Fruit stickers', 'placeholder': True, 'items': items}, open(os.path.join(OUT, 'items.json'), 'w'), indent=2)
print(len(items), 'stickers')
