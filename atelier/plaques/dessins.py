# Les dessins des plaques nominatives de Coopô. Tous sont originaux : chaque plaque est décrite ici, forme par forme.
# Une fiche de plaque :
#   id, label        son nom dans le code et son nom affiché
#   pa, pb           couleur du fond à gauche (sous le pseudo) et à droite          tx   couleur du texte (blanc si absent)
#   art              le dessin fixe (SVG) de la fenêtre de droite (240 x 60)
#   fx1, fx2         deux calques animés : ('fall', svg, {k, dur, up}) défile verticalement · ('drift', svg, {k, dur, left}) glisse sur le côté ·
#                    ('anim', svg, {nb, dur}) dessin animé image par image · ('still', svg, {extra}) calque fixe, avec une animation simple en option
#   bg, css          fond particulier et règles en plus (« & » = la ligne qui porte la plaque)
import math
from outils import *

PLAQUES = []
COMMUNS = {}          # les images utilisées par plusieurs plaques : rangées une seule fois dans la feuille de style


class Commun:
    def __init__(self, nom):
        self.nom = nom


def commun(nom, dessin):
    COMMUNS[nom] = dessin
    return Commun(nom)


def plaque(f):
    PLAQUES.append(f)
    return f


def toutes():
    return [f() for f in PLAQUES]


# ---------------------------------------------------------------- formes réutilisées
ETOILE = path(star_d(0, 0, 10), id='s')          # une étoile à 5 branches, de rayon 10 (on la réduit à la taille voulue)
ECLAT = path(sparkle_d(0, 0, 10), id='k')        # un éclat de lumière à 4 branches


def use(i, x, y, s=1, rot=0, **a):
    t = f'translate({n(x)} {n(y)})'
    if rot:
        t += f' rotate({n(rot)})'
    if s != 1:
        t += f' scale({n2(s)})'
    return f"<use href='#{i}' transform='{t}'{attrs(a)}/>"


def boucle_y(body, periode):
    """Le motif, répété au-dessus et au-dessous : il se raccorde sans couture quand il défile de haut en bas."""
    return f"<g id='w'>{body}</g><use href='#w' y='{-periode}'/><use href='#w' y='{periode}'/>"


def boucle_x(body, periode):
    return f"<g id='w'>{body}</g><use href='#w' x='{-periode}'/><use href='#w' x='{periode}'/>"


def ell(cx, cy, rx, ry, **a):
    return f"<ellipse cx='{n(cx)}' cy='{n(cy)}' rx='{n(rx)}' ry='{n(ry)}'{attrs(a)}/>"


def ligne(points, **a):
    return f"<polyline points='{pts(points)}' fill='none'{attrs(a)}/>"


def braises(r, nb, period=120, cols=('#FFB347', '#FF7A1A', '#FFE7A8'), x0=70, x1=236, halo=True, rmax=1.5):
    """Des braises (ou des étincelles) éparpillées : petits points lumineux, certains avec un halo."""
    o = ''
    for i in range(nb):
        x, y, rr = x0 + r.random() * (x1 - x0), r.random() * period, .5 + r.random() * (rmax - .5)
        c = cols[i % len(cols)]
        if halo and i % 3 == 0:
            o += circ(x, y, rr * 3.2, fill=c, opacity='.22')
        o += circ(x, y, rr, fill=c, opacity=n2(.6 + r.random() * .4))
    return o


BRAISES = commun('braises', svg(boucle_y(braises(rnd(3), 20, rmax=1.7), 120), W, 120))


# ================================================================ ÉDITION LIMITÉE
# ---------------------------------------------------------------- Galaxie : une pluie d'étoiles sur une nuit violette
def comete(x, y, R, L, r, pous=3):
    """Une étoile qui tombe : son halo, sa traînée qui s'efface vers le haut, et quelques éclats."""
    o = circ(x, y, R * 2.4, fill='url(#h)') + poly([(x - R * .55, y), (x + R * .55, y), (x, y - L)], fill='url(#t)') + poly([(x - R * .16, y), (x + R * .16, y), (x, y - L * .86)], fill='#fff', opacity='.6')
    for i in range(pous):
        t = (i + .8) / pous
        o += use('k', x + (r.random() - .5) * (3 + 7 * t) * (R / 4), y - R - t * L * .85, max(.06, R * .055 * (1 - t * .5)), fill='#fff', opacity=n2(.95 - .5 * t))
    return o + use('s', x, y, R * .1, fill='#fff')


@plaque
def galaxie():
    r = rnd(11)
    body = (ell(176, 20, 64, 20, fill='#9B4DFF', opacity='.5', filter='url(#b)') + ell(214, 46, 44, 15, fill='#FF5FC8', opacity='.34', filter='url(#b)')
            + ell(118, 44, 40, 12, fill='#4C7DFF', opacity='.26', filter='url(#b)'))
    body += g(ell(200, 30, 36, 9, fill='#C9A6FF', opacity='.5') + ell(200, 30, 20, 5, fill='#FFD9F4', opacity='.75') + ell(200, 30, 7, 2.6, fill='#fff'),
              transform='rotate(-20 200 30)', filter='url(#c)')
    body += ''.join(circ(30 + r.random() * 208, 3 + r.random() * 54, .4 + r.random() * .5, fill='#fff', opacity=n2(.35 + r.random() * .55)) for i in range(24))
    art = svg(body, defs=blur('b', 7) + blur('c', 2.2))
    d = ETOILE + ECLAT + lin('t', [(0, '#fff', 0), (1, '#F4EAFF', .7)]) + rad('h', [(0, '#E2C8FF', .6), (.5, '#B98BFF', .2), (1, '#B98BFF', 0)])
    b1 = ''
    for i in range(6):
        x, y, R = 60 + (i * 31 + r.random() * 14) % 176, r.random() * 120, 2 + r.random() * .8
        b1 += poly([(x - R * .6, y), (x + R * .6, y), (x, y - 16)], fill='url(#t)') + use('k', x, y, R * .14, fill='#fff')
    fx1 = svg(boucle_y(b1, 120), W, 120, d)
    b2 = ''.join(comete(x, y, R, L, r) for x, y, R, L in [(208, 38, 8, 52), (166, 98, 6.4, 46), (128, 24, 5, 36), (232, 108, 4.4, 30), (96, 80, 3.8, 28)])
    fx2 = svg(boucle_y(b2, 120), W, 120, d)
    return dict(id='galaxie', label='Galaxie', pa='#170B3B', pb='#3F1F86', art=art, fx1=('fall', fx1, dict(k=2, dur=10)), fx2=('fall', fx2, dict(k=2, dur=3.8)))


# ---------------------------------------------------------------- Dragon : des écailles, un œil qui s'allume, des braises
@plaque
def dragon():
    r = rnd(3)
    d = ("<pattern id='p' width='14' height='14' patternUnits='userSpaceOnUse'>"
         "<path d='M0 7A7 7 0 0 0 14 7L14 0A7 7 0 0 1 0 0Z' fill='#4A0B07' fill-opacity='.6'/>"
         "<path d='M-7 0A7 7 0 0 0 7 0A7 7 0 0 0 21 0M0 7A7 7 0 0 0 14 7' fill='none' stroke='#E8B045' stroke-opacity='.5' stroke-width='.9'/></pattern>"
         + rad('e', [(0, '#FFF1A8'), (.35, '#FFB52E'), (.75, '#E2560B'), (1, '#8A1C06')]) + lin('o', [(0, '#1A0404', .0), (1, '#1A0404', .75)]))
    body = rect(0, 0, 240, 60, fill='url(#p)') + rect(0, 0, 240, 60, fill='url(#o)')
    # l'arcade au-dessus de l'œil, et des piquants
    body += path('M150 30Q190 2 236 16L240 0L140 0Z', fill='#1A0404', opacity='.8')
    for x, h in [(156, 9), (170, 11), (186, 12), (203, 12), (220, 10)]:
        body += poly([(x - 5, 0), (x + 5, 0), (x + 1.5, h)], fill='#E8B045', opacity='.85')
    # l'œil
    body += path('M162 31Q196 8 232 28Q198 50 162 31Z', fill='#120303')
    body += path('M167 31Q197 13 227 28.5Q198 45 167 31Z', fill='url(#e)')
    body += path('M198 14Q205 30 198 44.5Q191 30 198 14Z', fill='#120303')
    body += ell(189, 23, 4.2, 2.2, fill='#fff', opacity='.75', transform='rotate(-24 189 23)')
    art = svg(body, defs=d)
    lueur = svg(ell(198, 30, 44, 24, fill='url(#g)'), defs=rad('g', [(0, '#FFC457', .55), (.6, '#FF7A1A', .18), (1, '#FF7A1A', 0)]))
    return dict(id='dragon', label='Dragon', pa='#220606', pb='#7C1509', art=art, fx1=('fall', BRAISES, dict(k=2, dur=6, up=True)),
                fx2=('still', lueur, dict(extra='plqPulse 1.6s ease-in-out infinite alternate')))


# ---------------------------------------------------------------- Foudre : un orage, des éclairs
def nuages(liste, fill, **a):
    return g(''.join(circ(x, y, rr) for x, y, rr in liste), fill=fill, **a)


@plaque
def foudre():
    r = rnd(5)
    nu1 = [(120, -2, 14), (142, 2, 16), (166, -1, 15), (188, 4, 18), (212, 0, 17), (234, 5, 16)]
    nu2 = [(132, -6, 13), (158, -8, 15), (180, -5, 14), (204, -8, 16), (228, -6, 15)]
    body = nuages(nu1, '#2B3F66') + nuages(nu2, '#3B5384') + rect(0, 0, 240, 60, fill='url(#o)')
    art = svg(body, defs=lin('o', [(0, '#0B1322', 0), (1, '#0B1322', .5)]))
    # la pluie : de fines traits penchés
    pl = ''
    for i in range(26):
        x, y = 60 + r.random() * 180, r.random() * 60
        pl += f"M{n(x)} {n(y)}l-2 7"
    fx1 = svg(boucle_y(path(pl, stroke='#A9C4FF', stroke_width='.7', stroke_opacity='.45', stroke_linecap='round'), 60), W, 60)
    # les éclairs, image par image
    A = 'M194 14L180 34L189 34L174 54L183 54L171 66L190 49L181 49L197 31L188 31L199 14Z'
    B = 'M228 12L219 27L226 27L214 44L221 44L212 60L229 40L222 40L234 25L227 25L235 12Z'
    C = 'M146 12L138 24L144 24L134 40L147 28L141 28L151 12Z'

    def eclair(d, fort=True):
        return (path(d, fill='#FFE94A', filter='url(#b)', opacity='.9' if fort else '.5') + path(d, fill='#FFFDE8' if fort else '#FFE94A', opacity='1' if fort else '.6'))

    vide = ''
    fr = [eclair(A) + nuages(nu1, '#6F8BC4', opacity='.55'), eclair(A, False), vide, vide, eclair(B) + eclair(C) + nuages(nu2, '#7C97CC', opacity='.6'), vide, eclair(B, False), vide]
    fx2 = frames(fr, defs=blur('b', 2.4))
    css = ("& > .plq::after{ background:#CFE0FF; transform:none; opacity:0; mix-blend-mode:screen; }\n&! > .plq::after{ animation:plqFoudre 2s steps(1) infinite; }\n"
           "@keyframes plqFoudre{ 0%{ opacity:0; } 1%{ opacity:.3; } 12.5%{ opacity:.08; } 25%{ opacity:0; } 50%{ opacity:.34; } 62.5%{ opacity:0; } 75%{ opacity:.07; } 87.5%{ opacity:0; } }")
    return dict(id='foudre', label='Foudre', pa='#0B1322', pb='#233A66', art=art, fx1=('fall', fx1, dict(k=1, dur=.5)), fx2=('anim', fx2, dict(nb=8, dur=2)), css=css)


# ================================================================ COULEURS : des pierres précieuses
# Les cinq plaques partagent le même dessin de cristaux, fait de facettes blanches et noires plus ou moins transparentes :
# posé « en incrustation » sur la couleur de la plaque, il donne des cristaux rouges, bleus, verts… sans redessiner cinq fois la même chose.
def cristal(bx, by, ang, L, w):
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def P(u, v):
        return (bx + u * ca + v * sa, by + u * sa - v * ca)
    s0, s1, s2, s3 = L * .68, L * .78, L * .74, L * .64
    xs = [-w, -w * .3, w * .42, w]
    faces = [([P(xs[0], 0), P(xs[1], 0), P(xs[1], s1), P(xs[0], s0)], '#000', .5), ([P(xs[1], 0), P(xs[2], 0), P(xs[2], s2), P(xs[1], s1)], '#fff', .16),
             ([P(xs[2], 0), P(xs[3], 0), P(xs[3], s3), P(xs[2], s2)], '#fff', .5), ([P(xs[0], s0), P(xs[1], s1), P(0, L)], '#000', .22),
             ([P(xs[1], s1), P(xs[2], s2), P(0, L)], '#fff', .85), ([P(xs[2], s2), P(xs[3], s3), P(0, L)], '#fff', .36)]
    return ''.join(poly(p, fill=c, fill_opacity=n2(a)) for p, c, a in faces), P(0, L), P(xs[2], s2)


def _cristaux():
    r = rnd(1)
    body, tips = ell(204, 62, 62, 26, fill='url(#g)'), []
    for bx, ang, L, w in [(150, -42, 20, 4.5), (232, 40, 26, 5.5), (170, -26, 34, 6.5), (216, 22, 40, 7.5), (184, -10, 30, 5.5), (200, 4, 50, 9), (160, -58, 12, 3.4), (238, 62, 12, 3.6)]:
        c, tip, sh = cristal(bx + r.random() * 2, 66, ang, L, w)
        body += c
        tips.append((tip, sh, L))
    ecl = ''.join(use('k', t[0], t[1], .12 + L * .009, fill='#fff', opacity='.95') + use('k', sh[0], sh[1], .09, fill='#fff', opacity='.8') for (t, sh, L) in tips[2:6])
    ecl += use('k', 136, 22, .22, fill='#fff', opacity='.7') + use('k', 226, 12, .28, fill='#fff', opacity='.8') + use('k', 166, 12, .14, fill='#fff', opacity='.6')
    return svg(body, defs=rad('g', [(0, '#fff', .5), (1, '#fff', 0)])), svg(ecl, defs=ECLAT)


_c, _e = _cristaux()
CRISTAUX, ECLATS = commun('cristaux', _c), commun('eclats', _e)


def gemme(pid, label, pa, pb):
    return dict(id=pid, label=label, pa=pa, pb=pb, fx1=('still', CRISTAUX, dict(css='mix-blend-mode:overlay;')), fx2=('still', ECLATS, dict(extra='plqPulse 1.3s ease-in-out infinite alternate')),
                css='& > .plq > i{ background-color:var(--pb); }')


@plaque
def rubis():
    return gemme('rubis', 'Rubis', '#3D0714', '#A3122F')


@plaque
def saphir():
    return gemme('saphir', 'Saphir', '#0A1A4F', '#1E4FC6')


@plaque
def emeraude():
    return gemme('emeraude', 'Émeraude', '#05301F', '#0E7C57')


@plaque
def ambre():
    return gemme('ambre', 'Ambre', '#3B2203', '#B5720F')


@plaque
def onyx():
    return gemme('onyx', 'Onyx', '#0D0E13', '#3A3D50')


# ================================================================ OFFERTE : la planète de Coopô
@plaque
def base():
    r = rnd(8)
    d = lin('p', [(0, '#A3ABD0'), (1, '#5A6186')]) + ECLAT
    body = ell(200, 31, 26, 7.6, fill='none', stroke='#C9D0EE', stroke_width='2.4', opacity='.55', transform='rotate(-19 200 31)')
    body += circ(200, 31, 13.5, fill='url(#p)')
    body += rect(194.6, 25.5, 3.4, 8.6, rx='1.6', fill='#1D2030') + rect(201.6, 25.5, 3.4, 8.6, rx='1.6', fill='#1D2030')
    body += path('M174 31A26 7.6 0 0 0 226 31', fill='none', stroke='#E3E8FA', stroke_width='2.4', stroke_linecap='round', transform='rotate(-19 200 31)')
    body += circ(223.6, 20.6, 3, fill='#F2F4FF')
    for i in range(14):
        body += circ(96 + r.random() * 140, 4 + r.random() * 52, .5 + r.random() * .5, fill='#fff', opacity=n2(.3 + r.random() * .4))
    art = svg(body, defs=d)
    fx2 = svg(use('k', 160, 16, .3, fill='#fff', opacity='.8') + use('k', 232, 44, .22, fill='#fff', opacity='.7') + use('k', 140, 44, .16, fill='#fff', opacity='.6'), defs=ECLAT)
    return dict(id='base', label='Classique', pa='#262A3A', pb='#4B5273', art=art, fx2=('still', fx2, dict(extra='plqPulse 1.5s ease-in-out infinite alternate')))


# ================================================================ DÉGRADÉS ANIMÉS
# ---------------------------------------------------------------- Aurore : le soleil se lève
def nuage_plat(x, y, w, h, col, op):
    return (rect(x, y, w, h, rx=n(h / 2), fill=col, opacity=n2(op)) + rect(x + w * .18, y - h * .7, w * .5, h, rx=n(h / 2), fill=col, opacity=n2(op))
            + rect(x + w * .4, y + h * .6, w * .45, h * .8, rx=n(h * .4), fill=col, opacity=n2(op * .8)))


@plaque
def aurore():
    d = lin('s', [(0, '#FFF0A0'), (1, '#FF8A3D')]) + rad('g', [(0, '#FFE08A', .7), (.5, '#FF9A4D', .3), (1, '#FF9A4D', 0)])
    body = circ(204, 62, 46, fill='url(#g)') + circ(204, 62, 21, fill='url(#s)')
    body += nuage_plat(108, 40, 46, 4, '#FFC1D9', .45) + nuage_plat(196, 50, 50, 4.5, '#C9418F', .55)
    for x, y, s in [(152, 16, 1), (164, 11, .8), (141, 23, .7)]:
        body += path(f'M{x} {y}q{n(2.2 * s)} {n(-2.4 * s)} {n(4.4 * s)} 0q{n(2.2 * s)} {n(-2.4 * s)} {n(4.4 * s)} 0', fill='none', stroke='#3B1259', stroke_width='1', stroke_linecap='round')
    art = svg(body, defs=d)
    nu = nuage_plat(20, 14, 52, 4.5, '#FFD3E2', .55) + nuage_plat(128, 30, 42, 3.6, '#FFB199', .5) + nuage_plat(190, 8, 34, 3.2, '#FFE1C4', .45)
    fx1 = svg(boucle_x(nu, 240), W, 60)
    ray = ''
    for i in range(9):
        a = math.radians(-170 + i * 20)
        a2 = a + math.radians(5)
        ray += poly([(204, 62), (204 + 70 * math.cos(a), 62 + 70 * math.sin(a)), (204 + 70 * math.cos(a2), 62 + 70 * math.sin(a2))], fill='#FFE9A8', opacity='.3')
    fx2 = svg(ray)
    return dict(id='aurore', label='Aurore', pa='#2B1463', pb='#D9541E', bg='linear-gradient(100deg,#2B1463 22%,#8E1F7A 58%,#DE5A22)', art=art,
                fx1=('drift', fx1, dict(k=1, dur=26)), fx2=('still', fx2, dict(extra='plqPulse 2.4s ease-in-out infinite alternate')))


# ---------------------------------------------------------------- Lagune : des vagues, une île, un palmier
def vague(y, amp, phase, fill, op, ecume=None, lam=60):
    p = [(x, y + amp * math.sin(2 * math.pi * x / lam + phase)) for x in range(0, 241, 10)]
    d = smooth(p) + 'L240 60L0 60Z'
    o = path(d, fill=fill, opacity=n2(op))
    if ecume:
        o += path(smooth(p), fill='none', stroke=ecume, stroke_width='1', stroke_opacity='.6')
    return o


@plaque
def lagune():
    d = rad('g', [(0, '#D9FFF4', .6), (1, '#D9FFF4', 0)]) + ECLAT
    body = circ(206, 10, 40, fill='url(#g)')
    # l'île et son palmier
    body += path('M176 44Q196 30 222 44Z', fill='#F2D9A0')
    body += path('M198 40Q194 26 201 13', fill='none', stroke='#063042', stroke_width='2.2', stroke_linecap='round')
    for dx, dy, cx, cy in [(-17, 2, -9, -8), (16, 3, 9, -8), (-12, -9, -7, -9), (13, -8, 7, -9), (1, -13, 3, -8)]:
        body += path(f'M201 13Q{201 + cx} {13 + cy} {201 + dx} {13 + dy}Q{201 + cx * .7} {13 + cy * .35} 201 13Z', fill='#063042')
    body += vague(40, 2.2, 0, '#128C92', .95)
    art = svg(body, defs=d)
    fx1 = svg(vague(47, 2.6, 1.2, '#1FB3A6', .8, '#D9FFF4'), W, 60)
    ecl = use('k', 130, 52, .16, fill='#fff', opacity='.8') + use('k', 214, 56, .14, fill='#fff', opacity='.7') + use('k', 60, 55, .12, fill='#fff', opacity='.7')
    fx2 = svg(vague(53, 2, 3.4, '#6BE3CF', .6, '#fff') + ecl, W, 60, ECLAT)
    return dict(id='lagune', label='Lagune', pa='#06324F', pb='#0F8E8C', art=art, fx1=('drift', fx1, dict(k=1, dur=7)), fx2=('drift', fx2, dict(k=1, dur=11, left=False)))


# ---------------------------------------------------------------- Braise : des charbons rouges, des braises qui montent
@plaque
def braise():
    r = rnd(21)
    body = ell(186, 60, 84, 26, fill='url(#g)')
    for cx, cy, R in [(132, 55, 13), (160, 52, 16), (192, 50, 19), (224, 53, 16), (176, 60, 11), (210, 62, 12)]:
        p = [(cx + R * (.8 + r.random() * .35) * math.cos(a), cy + R * .6 * (.8 + r.random() * .35) * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]]
        body += path(smooth(p, closed=True), fill='#170806')
        k = [(cx - R * .6, cy - R * .08), (cx - R * .18, cy + R * .14), (cx + R * .1, cy - R * .22), (cx + R * .55, cy + R * .02)]
        body += ligne(k, stroke='#FF6A1A', stroke_width='1.8', stroke_linejoin='round', stroke_linecap='round') + ligne(k, stroke='#FFE0A8', stroke_width='.6', stroke_linejoin='round')
    art = svg(body, defs=rad('g', [(0, '#FF7A1A', .7), (1, '#FF7A1A', 0)]))
    lueur = svg(ell(186, 58, 80, 24, fill='url(#g)'), defs=rad('g', [(0, '#FFC457', .5), (1, '#FF7A1A', 0)]))
    return dict(id='braise', label='Braise', pa='#240707', pb='#8A1F0E', art=art, fx1=('fall', BRAISES, dict(k=2, dur=6.5, up=True)),
                fx2=('still', lueur, dict(extra='plqPulse 1.1s ease-in-out infinite alternate')))


# ---------------------------------------------------------------- Néon : des tubes lumineux qui grésillent
@plaque
def neon():
    formes = [('M0 5C-10 -3 -5 -11 0 -5.5C5 -11 10 -3 0 5Z', 148, 31, 1.5, '#FF5CA8'), (star_d(0, 0, 13, 5.6), 190, 30, 1, '#5CE1FF'), ('M-5 -17L5 -6L-4 -1L6 15', 226, 31, 1, '#7CFFCB')]
    eteint, allume = '', ''
    for dd, x, y, s, col in formes:
        t = f'translate({x} {y}) scale({s})'
        eteint += path(dd, transform=t, stroke=col, stroke_width=n(2.2 / s), stroke_opacity='.4')
        allume += (path(dd, transform=t, stroke=col, stroke_width=n(6 / s), stroke_opacity='.5', filter='url(#b)') + path(dd, transform=t, stroke=col, stroke_width=n(2.4 / s))
                   + path(dd, transform=t, stroke='#fff', stroke_width=n(.8 / s), stroke_opacity='.9'))
    a = dict(fill='none', stroke_linejoin='round', stroke_linecap='round')
    art = svg(g(eteint, **a))
    fx2 = svg(g(allume, **a), defs=blur('b', 2.2))
    css = "@keyframes plqNeon{ 0%,7%,11%,41%,53%,100%{ opacity:1; } 9%{ opacity:.3; } 44%{ opacity:.15; } 47%{ opacity:.85; } 50%{ opacity:.25; } }"
    return dict(id='neon', label='Néon', pa='#0D0B1E', pb='#261B52', art=art, fx2=('still', fx2, dict(extra='plqNeon 3.2s linear infinite')), css=css)


# ================================================================ MOTIFS GAMING
# ---------------------------------------------------------------- Pixel : un petit paysage en gros pixels
def pixels(rows, x0, y0, u, pal):
    """Un dessin en pixels à partir de lignes de lettres (un caractère = un pixel, « . » = vide)."""
    par = {}
    for j, row in enumerate(rows):
        i = 0
        while i < len(row):
            c = row[i]
            if c == '.' or c == ' ':
                i += 1
                continue
            k = i
            while k < len(row) and row[k] == c:
                k += 1
            par.setdefault(c, '')
            par[c] += f'M{n(x0 + i * u)} {n(y0 + j * u)}h{n((k - i) * u)}v{n(u)}h{n(-(k - i) * u)}z'
            i = k
    return ''.join(path(d, fill=pal[c]) for c, d in par.items())


def collines(h, x0, x1, u, fill):
    d = f'M{x0} 60'
    for x in range(x0, x1, u):
        d += f'V{n(60 - round(h(x) / u) * u)}h{u}'
    return path(d + 'V60Z', fill=fill)


@plaque
def pixel():
    u = 2
    body = ''
    for x, y in [(112, 8), (140, 20), (164, 6), (196, 14), (226, 8), (128, 30), (180, 26), (212, 28)]:
        body += rect(x, y, u, u, fill='#fff', opacity='.7')
    body += pixels(['..####....', '.#######..', '##########'], 138, 10, u, {'#': '#DDE6FF'}) + pixels(['...###..', '.######.', '########'], 200, 18, u, {'#': '#B9C8F5'})
    body += collines(lambda x: 13 + 7 * math.sin(x / 19) + 3 * math.sin(x / 7), 90, 240, u, '#2F7D4F')
    body += collines(lambda x: 7 + 5 * math.sin(x / 13 + 2) + 2 * math.sin(x / 5), 90, 240, u, '#46B065')
    body += pixels(['..b..', '..b..', '..b..', '..b..', '..b..', 'ggggg', '..m..', '..m..'], 182, 28, u, {'b': '#E6ECF5', 'g': '#FFD23F', 'm': '#8A5A2B'})
    art = svg(body)
    coeur1 = ['.rr.rr.', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']
    coeur2 = ['.......', '..r.r..', '.rRrrr.', '.rrrrr.', '..rrr..', '...r...']
    pal = {'r': '#FF4D6D', 'R': '#FFC2CF', 'o': '#FFD23F', 'O': '#FFF3B0', 'd': '#B8860B'}
    pieces = [['.oooo.', 'oOoooo', 'oOoodo', 'oooodo', 'oooddo', '.oooo.'], ['..oo..', '.oOoo.', '.oOod.', '.oood.', '.oodd.', '..oo..'], ['..oo..', '..oo..', '..od..', '..od..', '..od..', '..oo..'],
              ['..oo..', '.oOoo.', '.oOod.', '.oood.', '.oodd.', '..oo..']]
    fr = []
    for f in range(4):
        b = pixels(pieces[f], 212, 32, u, pal) + pixels(coeur1 if f < 2 else coeur2, 152, 24, u, pal)
        b += rect(226, 8, u, u, fill='#fff') + (rect(224, 8, 6, u, fill='#fff', opacity='.8') + rect(226, 6, u, 6, fill='#fff', opacity='.8') if f % 2 else '')
        fr.append(b)
    fx2 = frames(fr)
    return dict(id='pixel', label='Pixel', pa='#1B2036', pb='#30477A', art=art, fx2=('anim', fx2, dict(nb=4, dur=.9)))


# ---------------------------------------------------------------- Manette : les boutons s'allument tour à tour
@plaque
def manette():
    cx, cy = 190, 30
    corps = 'M-34 -6C-34 -18 -24 -20 -14 -18L14 -18C24 -20 34 -18 34 -6L37 14C38 22 28 24 23 16L18 8L-18 8L-23 16C-28 24 -38 22 -37 14Z'
    bt = [(20, -11, '#FFD166'), (25.5, -6, '#F26B7A'), (20, -1, '#5CC8FF'), (14.5, -6, '#7EE08A')]
    body = ''
    for x, y, t in [(118, 14, '+'), (136, 44, 'o'), (150, 10, 'o'), (232, 50, '+'), (240, 12, 'o'), (108, 40, '+')]:
        body += (path(f'M{x - 3} {y}h6M{x} {y - 3}v6', stroke='#C9BEF5', stroke_width='1.4', stroke_linecap='round', opacity='.4') if t == '+'
                 else circ(x, y, 2.6, fill='none', stroke='#C9BEF5', stroke_width='1.3', opacity='.4'))
    m = path(corps, fill='#1A0F3D', opacity='.35', transform='translate(1.5 2.5)') + path(corps, fill='url(#g)')
    m += rect(-22, -12, 4, 12, rx='1.2', fill='#3B2A7A') + rect(-26, -8, 12, 4, rx='1.2', fill='#3B2A7A')
    for x in (-8, 8):
        m += circ(x, 2, 4.4, fill='#3B2A7A') + circ(x, 1.2, 2.6, fill='#5B49A8')
    m += rect(-4.5, -9, 3.4, 1.8, rx='.9', fill='#8F82CC') + rect(1.1, -9, 3.4, 1.8, rx='.9', fill='#8F82CC')
    for x, y, c in bt:
        m += circ(x, y, 2.5, fill=c, opacity='.5')
    body += g(m, transform=f'translate({cx} {cy})')
    art = svg(body, defs=lin('g', [(0, '#F6F3FF'), (1, '#BDB0F0')]))
    fr = ['']
    for x, y, c in bt:
        fr.append(g(circ(x, y, 6.5, fill=c, opacity='.45', filter='url(#b)') + circ(x, y, 2.9, fill=c) + circ(x - .7, y - .8, 1, fill='#fff', opacity='.85'), transform=f'translate({cx} {cy})'))
    fx2 = frames(fr, defs=blur('b', 1.6))
    return dict(id='manette', label='Manette', pa='#24164F', pb='#5B3FC4', art=art, fx2=('anim', fx2, dict(nb=5, dur=1.5)))


# ---------------------------------------------------------------- Circuit : le courant passe dans les pistes
def le_long(p, t):
    """Le point situé à la fraction t (0 à 1) d'une ligne brisée."""
    seg = [math.dist(p[i], p[i + 1]) for i in range(len(p) - 1)]
    d = t * sum(seg)
    for i, s in enumerate(seg):
        if d <= s or i == len(seg) - 1:
            k = d / s if s else 0
            return (p[i][0] + (p[i + 1][0] - p[i][0]) * k, p[i][1] + (p[i + 1][1] - p[i][1]) * k)
        d -= s


@plaque
def circuit():
    T = [[(100, 15), (166, 15), (176, 25), (196, 25)], [(88, 40), (140, 40), (150, 30), (196, 30)], [(172, 62), (172, 45), (182, 35), (196, 35)],
         [(219, -2), (209, 8), (209, 20)], [(242, 30), (222, 30)], [(223, 62), (209, 48), (209, 40)], [(150, 30), (150, 6), (130, 6)], [(242, 48), (232, 48), (222, 38)]]
    body = ''.join(ligne(t, stroke='#2DD4A3', stroke_width='1.3', stroke_opacity='.55', stroke_linejoin='round') for t in T)
    for x, y in [(100, 15), (88, 40), (130, 6), (150, 30)]:
        body += circ(x, y, 2.3, fill='#05241D', stroke='#2DD4A3', stroke_width='1.2', stroke_opacity='.8')
    pins = ''.join(f'M{196 - 3} {y}h3M222 {y}h3' for y in (25, 30, 35)) + ''.join(f'M{x} {20 - 3}v3M{x} 40v3' for x in (203, 209, 215))
    body += path(pins, stroke='#7DEFCB', stroke_width='1.4') + rect(196, 20, 26, 20, rx='2.5', fill='#0A3B2F', stroke='#2DD4A3', stroke_width='1.2')
    body += rect(201, 25, 16, 10, rx='1.5', fill='#0F5443') + circ(200, 23.6, .9, fill='#7DEFCB')
    art = svg(body)
    fr = []
    for f in range(8):
        b = ''
        for i, t in enumerate(T[:6]):
            x, y = le_long(t, ((f / 8) + i * .37) % 1)
            b += f"<use href='#d' x='{n(x)}' y='{n(y)}'/>"
        if f in (2, 3, 6):
            b += rect(201, 25, 16, 10, rx='1.5', fill='#7DEFCB', opacity='.5')
        fr.append(b)
    fx2 = frames(fr, defs=g(circ(0, 0, 3.4, fill='#7DEFCB', opacity='.35') + circ(0, 0, 1.4, fill='#EFFFF9'), id='d'))
    return dict(id='circuit', label='Circuit', pa='#05241D', pb='#0D5140', art=art, fx2=('anim', fx2, dict(nb=8, dur=1.6)))


# ---------------------------------------------------------------- Damier : un drapeau à damier qui flotte
@plaque
def damier():
    NC, NR, N = 8, 3, 4
    x0, y0, cw, ch = 74, 9, 21, 14
    fr = []
    for f in range(N):
        def V(c, rr):
            ph = 2 * math.pi * (c / 4.4 - f / N)
            return (x0 + c * cw + 1.2 * math.cos(ph), y0 + rr * ch + (1.2 + c * .62) * math.sin(ph))
        haut, bas = [V(c, 0) for c in range(NC + 1)], [V(c, NR) for c in range(NC + 1)]
        b = poly(haut + bas[::-1], fill='#15151B')
        blancs = ''
        for c in range(NC):
            for rr in range(NR):
                if (c + rr) % 2 == 0:
                    q = [V(c, rr), V(c + 1, rr), V(c + 1, rr + 1), V(c, rr + 1)]
                    blancs += 'M' + 'L'.join(f'{n(x)} {n(y)}' for x, y in q) + 'Z'
        b += path(blancs, fill='#F3F3F6')
        for c in range(NC):
            om = max(0, math.cos(2 * math.pi * ((c + .5) / 4.4 - f / N)))
            if om > .15:
                b += poly([V(c, 0), V(c + 1, 0), V(c + 1, NR), V(c, NR)], fill='#000', opacity=n2(om * .32))
        b += ligne(haut, stroke='#FFD23F', stroke_width='1.8', stroke_linejoin='round') + ligne(bas, stroke='#FFD23F', stroke_width='1.8', stroke_linejoin='round')
        fr.append(g(b, mask='url(#m)'))
    # le drapeau s'efface vers la gauche (sans cela, son bord gauche ferait une coupure nette)
    fondu = ("<linearGradient id='f' gradientUnits='userSpaceOnUse' x1='74' x2='156'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#fff'/></linearGradient>"
             "<mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='240' height='60'><rect width='240' height='60' fill='url(#f)'/></mask>")
    fx2 = frames(fr, defs=fondu)
    return dict(id='damier', label='Damier', pa='#121217', pb='#2E2E3A', fx2=('anim', fx2, dict(nb=N, dur=.7)))


# ================================================================ EFFETS BRILLANTS (plaques claires : le pseudo est écrit en sombre)
@plaque
def or_():
    d = ("<pattern id='p' width='7' height='7' patternUnits='userSpaceOnUse' patternTransform='rotate(35)'><path d='M0 0V7' stroke='#8A6200' stroke-width='1.1' stroke-opacity='.22'/></pattern>"
         + lin('c', [(0, '#B98A14'), (1, '#8A6200')]))
    couronne = 'M-20 9L-24 -10L-11 0L0 -15L11 0L24 -10L20 9Z'
    c = path(couronne, fill='#FFF6CF', opacity='.75', transform='translate(-1 -1)') + path(couronne, fill='#6B4A00', opacity='.4', transform='translate(1 1.2)') + path(couronne, fill='url(#c)')
    c += rect(-20, 10.5, 40, 4.5, rx='1.5', fill='url(#c)') + ''.join(circ(x, y, 2.3, fill='#FFF3C0', stroke='#8A6200', stroke_width='.7') for x, y in [(-24, -10), (0, -15), (24, -10)])
    c += ''.join(circ(x, 12.7, 1.2, fill='#FFF3C0') for x in (-12, 0, 12))
    art = svg(rect(0, 0, 240, 60, fill='url(#p)') + g(c, transform='translate(196 31)'), defs=d)
    ecl = ''.join(use('k', x, y, s, fill='#fff', opacity='.95') for x, y, s in [(160, 14, .5), (228, 44, .42), (140, 44, .3), (226, 12, .34), (172, 50, .22), (120, 20, .24)])
    fx2 = svg(ecl, defs=ECLAT)
    css = "& > .plq::after{ background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.75) 50%,transparent 60%); }\n&! > .plq::after{ animation-duration:3.2s; }"
    return dict(id='or', label='Or', pa='#F4D46C', pb='#E0B03A', tx='#2A1E00', bg='linear-gradient(180deg,#FBE591,#DDAE33 55%,#F3D066)', art=art,
                fx2=('still', fx2, dict(extra='plqPulse 1.1s ease-in-out infinite alternate')), css=css)


@plaque
def chrome():
    d = ("<pattern id='p' width='240' height='3' patternUnits='userSpaceOnUse'><path d='M0 .5H240' stroke='#fff' stroke-opacity='.35' stroke-width='.6'/></pattern>"
         + lin('m', [(0, '#fff'), (.34, '#D9E0E8'), (.5, '#4E5966'), (.57, '#9AA5B2'), (1, '#F5F8FA')]) + rad('o', [(0, '#1B222C', .45), (1, '#1B222C', 0)]) + ECLAT)
    body = rect(0, 0, 240, 60, fill='url(#p)')
    for x, y, R in [(202, 30, 19), (164, 40, 10), (232, 12, 7), (140, 18, 5.5)]:
        body += ell(x + R * .15, y + R * 1.02, R * .95, R * .28, fill='url(#o)')
        body += circ(x, y, R, fill='url(#m)', stroke='#3F4955', stroke_width='.7', stroke_opacity='.6')
        body += ell(x - R * .36, y - R * .5, R * .34, R * .17, fill='#fff', opacity='.95', transform=f'rotate(-28 {n(x - R * .36)} {n(y - R * .5)})')
    art = svg(body, defs=d)
    fx2 = svg(use('k', 194, 21, .5, fill='#fff') + use('k', 160.5, 35, .3, fill='#fff') + use('k', 229.5, 8.5, .22, fill='#fff'), defs=ECLAT)
    css = "& > .plq::after{ background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.8) 50%,transparent 60%); }\n&! > .plq::after{ animation-duration:3.6s; }"
    return dict(id='chrome', label='Chrome', pa='#E6EBF0', pb='#AEB8C5', tx='#0F141B', bg='linear-gradient(180deg,#F5F8FA,#C6CFD9 40%,#8E9AA8 51%,#BCC5CF 58%,#E9EEF2)', art=art,
                fx2=('still', fx2, dict(extra='plqPulse .9s ease-in-out infinite alternate')), css=css)


@plaque
def holo():
    r = rnd(4)
    d = "<pattern id='p' width='9' height='9' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><path d='M0 0V9' stroke='#fff' stroke-width='2' stroke-opacity='.3'/></pattern>" + ECLAT + ETOILE
    body = rect(0, 0, 240, 60, fill='url(#p)')
    for i in range(16):
        x, y, s = 96 + r.random() * 140, 5 + r.random() * 50, .14 + r.random() * .34
        body += use('k' if i % 3 else 's', x, y, s * (.8 if i % 3 else .55), rot=r.random() * 40, fill='#fff', opacity=n2(.7 + r.random() * .3))
    art = svg(body, defs=d)
    fx2 = svg(use('k', 204, 28, .9, fill='#fff', opacity='.95') + use('k', 150, 16, .5, fill='#fff', opacity='.9') + use('k', 232, 50, .4, fill='#fff', opacity='.9'), defs=ECLAT)
    css = ("& > .plq{ background-size:300% 100%; }\n&! > .plq{ animation:plqHolo 6s linear infinite; }\n@keyframes plqHolo{ to{ background-position:-300% 0; } }\n"
           "& > .plq::after{ background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.8) 50%,transparent 60%); }\n&! > .plq::after{ animation-duration:3.4s; }")
    return dict(id='holo', label='Holo', pa='#B8F3FF', pb='#FFD6E8', tx='#1B1030', bg='linear-gradient(110deg,#B8F3FF,#E3C4FF,#FFD6E8,#C9FFD9,#B8F3FF)', art=art,
                fx2=('still', fx2, dict(extra='plqPulse 1s ease-in-out infinite alternate')), css=css)


# ================================================================ À GAGNER : les flammes
# Un seul dessin animé de feu (4 images) sert aux quatre plaques : il est montré petit pour « Étincelle », grand pour « Fournaise »,
# et viré au bleu pour la « Flamme éternelle ».
def langue(x, w, h, lean, f, N, k):
    """Une langue de feu, image f sur N : elle se tord doucement."""
    ph = 2 * math.pi * (f / N) + k * 1.7
    tx, mx = x + lean + math.sin(ph) * w * .22, math.sin(ph + 1.3) * w * .16
    q = lambda v: str(int(round(v)))
    return (f"M{q(x - w / 2)} 60C{q(x - w * .62 + mx)} {q(60 - h * .45)} {q(x - w * .1 + mx)} {q(60 - h * .6)} {n(tx)} {q(60 - h)}"
            f"C{q(x + w * .22 + mx)} {q(60 - h * .58)} {q(x + w * .66 + mx)} {q(60 - h * .4)} {q(x + w / 2)} 60Z")


def _feu(N=4):
    langues = [(140, 16, 26, -1), (162, 22, 40, 1), (186, 27, 55, -1), (210, 24, 46, 1), (231, 18, 34, -1)]
    cols = [('#D8320B', 1, 1), ('#FF7A1A', .72, .78), ('#FFC02E', .46, .55), ('#FFF3B0', .22, .3)]
    fr = []
    for f in range(N):
        fr.append(''.join(path(''.join(langue(x, w * sw, h * sh, lean, f, N, i + li * .4) for i, (x, w, h, lean) in enumerate(langues)), fill=c) for li, (c, sw, sh) in enumerate(cols)))
    return frames(fr)


FEU = commun('feu', _feu())


def feu(pid, label, pa, pb, taille, dur=.55, bdur=5, lueur='255,122,26', bleu=False):
    t = f'{taille * 100:g}%'
    plus = f'top:auto; bottom:0; left:auto; width:{t}; height:{t};' + (' filter:hue-rotate(195deg) saturate(1.25) brightness(1.12);' if bleu else '')
    return dict(id=pid, label=label, pa=pa, pb=pb, bg=f'radial-gradient(ellipse {60 * taille:g}% {150 * taille:g}% at 86% 100%,rgba({lueur},.55),transparent),linear-gradient(100deg,{pa} 30%,{pb})',
                fx1=('fall', BRAISES, dict(k=2, dur=bdur, up=True, css='filter:hue-rotate(170deg) brightness(1.5);' if bleu else '')), fx2=('anim', FEU, dict(nb=4, dur=dur, css=plus)))


@plaque
def flamme10():
    return feu('flamme10', 'Étincelle', '#2A1206', '#5E2A0A', .46)


@plaque
def flamme30():
    return feu('flamme30', 'Brasier', '#2E0F05', '#8A2C06', .7)


@plaque
def flamme100():
    return feu('flamme100', 'Fournaise', '#3A0B04', '#B03A08', 1, dur=.45, bdur=4)


@plaque
def flamme365():
    return feu('flamme365', 'Flamme éternelle', '#120A2E', '#2C1E7A', 1, dur=.5, bdur=4.5, lueur='91,120,255', bleu=True)


# ---------------------------------------------------------------- Souvenir Awalé : le plateau du jeu et ses graines
@plaque
def souvenir():
    r = rnd(9)
    d = lin('b', [(0, '#B07A3C'), (1, '#7A4E22')]) + rad('t', [(0, '#3A2110'), (1, '#5E3A1A')])
    body = rect(132, 8, 106, 44, rx='10', fill='#4A2C12') + rect(134, 9.5, 102, 40.5, rx='9', fill='url(#b)')
    for y in (17, 30, 43.5):
        body += path(f'M140 {y}q24 -2.4 48 0t44 0', fill='none', stroke='#5E3A1A', stroke_width='.7', stroke_opacity='.5')
    for j, y in enumerate((20.5, 39)):
        for i in range(6):
            x = 146 + i * 15.6
            body += ell(x, y, 6.4, 6.2, fill='url(#t)') + ell(x, y + .8, 5.6, 5.2, fill='#2E190B', opacity='.55')
            for k in range(2 + (i + j) % 3):
                a = r.random() * 6.28
                body += circ(x + math.cos(a) * 2.6 * r.random() ** .5, y + .6 + math.sin(a) * 2.2 * r.random() ** .5, 1.4, fill='#E3D7BC' if k % 2 else '#B9AA86')
    art = svg(body, defs=d)
    return dict(id='souvenir', label='Souvenir Awalé', pa='#2A190F', pb='#6A4422', art=art)


# ================================================================ NOUVELLES PLAQUES ILLUSTRÉES
# ---------------------------------------------------------------- Coquelicots : un pré au soleil couchant, des papillons
def herbes(r, nb, x0, x1, hmin, hmax, fill, op=1):
    d = ''
    for i in range(nb):
        x, h, le = x0 + r.random() * (x1 - x0), hmin + r.random() * (hmax - hmin), (r.random() - .5) * 7
        d += f'M{n(x)} 61Q{n(x + le * .4)} {n(61 - h * .6)} {n(x + le)} {n(61 - h)}Q{n(x + le * .4 + 1.3)} {n(61 - h * .5)} {n(x + 2.4)} 61Z'
    return path(d, fill=fill, opacity=n2(op) if op != 1 else None)


@plaque
def coquelicots():
    r = rnd(17)
    # une fleur vue de face (f) et une fleur vue de côté (c), de rayon 10 : on les pose ensuite où l'on veut, à la taille voulue
    d = (rad('g', [(0, '#FFF0B8', .85), (.5, '#FFCB70', .32), (1, '#FFCB70', 0)])
         + g(ell(-5.2, -.8, 8, 7.4, fill='#B81F1F') + ell(5.2, -.8, 8, 7.4, fill='#C92A22') + ell(0, -5, 8.6, 7, fill='#E8402E') + ell(0, 4.6, 9, 7.2, fill='#F6603C')
             + circ(0, 0, 3.4, fill='#2A0F1E') + circ(0, 0, 1.4, fill='#F2C14E'), id='f')
         + g(path('M-10 -2.5Q-9.5 9 0 8Q9.5 9 10 -2.5Q5 -8 0 -3Q-5 -8 -10 -2.5Z', fill='#D9321F') + path('M-5.5 -1Q0 7.5 5.5 -1Q0 -5.5 -5.5 -1Z', fill='#F6603C'), id='c'))
    body = circ(224, 0, 66, fill='url(#g)') + path('M60 60Q120 34 176 42T240 30V60Z', fill='#2F6A2C', opacity='.85') + herbes(r, 30, 70, 240, 10, 26, '#56993A')
    fleurs = [(120, 31, 5, -12, 'f'), (141, 41, 4, 10, 'c'), (159, 25, 6.6, 8, 'f'), (179, 38, 4.6, -8, 'c'), (197, 21, 7.6, -6, 'f'), (215, 37, 5.6, 12, 'f'), (231, 25, 6.4, 6, 'c'), (105, 45, 3.6, 0, 'c'),
              (238, 45, 4.4, -10, 'f')]
    tiges = ''
    for x, y, R, rot, k in fleurs:
        b = (r.random() - .5) * 8
        tiges += f'M{n(x)} {n(y + R * .5)}Q{n(x + b)} {n((y + 60) / 2 + 4)} {n(x + b * .5)} 61'
    for x, y in [(168, 46), (206, 48)]:          # deux boutons qui penchent
        tiges += f'M{x} 61Q{x - 1} {y + 4} {x + 3} {y}'
        body += ell(x + 4, y + 1.6, 1.7, 2.6, fill='#3F7A33', transform=f'rotate(30 {x + 4} {y + 1.6})')
    body += path(tiges, fill='none', stroke='#2F6B2A', stroke_width='1.3', stroke_linecap='round')
    body += ''.join(use(k, x, y, R / 10, rot) for x, y, R, rot, k in fleurs)
    body += herbes(r, 20, 70, 240, 6, 15, '#24521F') + herbes(r, 9, 90, 240, 12, 22, '#B4DB6A', .6)
    art = svg(body, defs=d)

    # pétales et pollen qui tombent doucement
    pe = ''
    for i in range(9):
        x, y = 70 + r.random() * 166, r.random() * 120
        pe += ell(x, y, 2.3, 1.4, fill='#F25A3A' if i % 2 else '#D9321F', transform=f'rotate({n(r.random() * 180)} {n(x)} {n(y)})')
    pe += ''.join(circ(70 + r.random() * 166, r.random() * 120, .6 + r.random() * .5, fill='#FFE9A8', opacity=n2(.5 + r.random() * .4)) for i in range(10))
    fx1 = svg(boucle_y(pe, 120), W, 120)

    # deux papillons : 4 images, les ailes s'ouvrent et se ferment
    aile = ("<g id='a'><path d='M0 0C3 -8 12 -9 11 -2.5C10.5 1 5 2 0 1Z' fill='#FF9A3C' stroke='#7A2E0A' stroke-width='.7'/>"
            "<path d='M0 1C4 2 8.5 5 6.5 8.5C4.5 10.5 1 6 0 2Z' fill='#FFB65C' stroke='#7A2E0A' stroke-width='.7'/><circle cx='8.2' cy='-4.4' r='1' fill='#fff'/></g>"
            "<g id='o'><ellipse cy='1.5' rx='.9' ry='4' fill='#2A1206'/><path d='M0 -2.2Q-1.6 -5.5 -3 -6.2M0 -2.2Q1.6 -5.5 3 -6.2' fill='none' stroke='#2A1206' stroke-width='.5'/></g>")
    fr = []
    for f in range(4):
        b = ''
        for (x, y, sc, a), dec in (((150, 15, .8, -18), 0), ((207, 9, .62, 22), 2)):
            o = [1, .62, .16, .62][(f + dec) % 4]
            b += g(f"<use href='#a' transform='scale({n2(o)} 1)'/><use href='#a' transform='scale({n2(-o)} 1)'/><use href='#o'/>", transform=f'translate({x} {y}) rotate({a}) scale({sc})')
        fr.append(b)
    fx2 = frames(fr, defs=aile)
    return dict(id='coquelicots', label='Coquelicots', pa='#14301E', pb='#447A31', art=art, fx1=('fall', fx1, dict(k=2, dur=11)),
                fx2=('anim', fx2, dict(nb=4, dur=.42, extra=', plqBob 2.6s ease-in-out infinite alternate')))


# ---------------------------------------------------------------- Bouffon : un bonnet à grelots sur des losanges d'arlequin
@plaque
def bouffon():
    r = rnd(13)
    d = ("<pattern id='p' width='18' height='24' patternUnits='userSpaceOnUse'><rect width='18' height='24' fill='#240A12'/>"
         "<path d='M9 0L18 12L9 24L0 12Z' fill='#9B1B34' stroke='#E0B04A' stroke-width='.6' stroke-opacity='.55'/></pattern>" + lin('o', [(0, '#1C0A12', .15), (1, '#1C0A12', .7)]))
    art = svg(rect(0, -6, 240, 72, fill='url(#p)') + rect(0, 0, 240, 60, fill='url(#o)'), defs=d)
    # les quatre couleurs d'un jeu de cartes, qui montent doucement
    sym = ("<path id='c' d='M0 4C-7 -2 -3.5 -8 0 -4C3.5 -8 7 -2 0 4Z'/><path id='l' d='M0 -6L4.2 0L0 6L-4.2 0Z'/>"
           "<path id='q' d='M0 -6C7 0 3.5 6 0 2.4C-3.5 6 -7 0 0 -6ZM-2 6.5L0 2L2 6.5Z'/><path id='t' d='M0 -5.6a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 1 1 0 -5.2M-2.9 -1.4a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 1 1 0 -5.2M2.9 -1.4a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 1 1 0 -5.2M-1.8 6.5L0 2L1.8 6.5Z'/>")
    pp = ''
    for i in range(12):
        k = 'clqt'[i % 4]
        pp += use(k, 74 + (i * 37 + r.random() * 20) % 160, r.random() * 120, .55 + r.random() * .5, rot=r.random() * 40 - 20, fill='#FF6B81' if k in 'cl' else '#F5E6C8', opacity=n2(.4 + r.random() * .3))
    fx1 = svg(boucle_y(pp, 120), W, 120, sym)
    # le bonnet : trois cornes, des grelots, une collerette
    def grelot(x, y):
        return circ(x, y, 3, fill='#F2C14E', stroke='#8A6200', stroke_width='.6') + path(f'M{x - 1.6} {y + .6}h3.2', stroke='#8A6200', stroke_width='.8', stroke_linecap='round') + circ(x - .9, y - 1, .8, fill='#FFF3C0')
    corne = 'M-15 -5C-16 -18 -27 -27 -36 -20C-41 -16 -41 -9 -39 -5C-36 -13 -29 -17 -22 -13C-15 -10 -9 -7 -1 -5Z'
    ombre = 'M-15 -5C-16 -18 -27 -27 -36 -20C-30 -22 -21 -17 -15 -5Z'
    b = path(corne, fill='#F5E6C8') + path(ombre, fill='#C9B48A', opacity='.7') + g(path(corne, fill='#F5E6C8') + path(ombre, fill='#C9B48A', opacity='.7'), transform='scale(-1 1)')
    b += path('M-9 -5C-11 -24 -4 -37 5 -44C2 -32 9 -19 9 -5Z', fill='#E63950') + path('M-1 -5C-1 -22 1 -34 5 -44C2 -32 9 -19 9 -5Z', fill='#B81F36')
    b += ''.join(poly([(x, 0), (x + 4.5, 8), (x + 9, 0)], fill='#E63950' if i % 2 else '#F5E6C8') for i, x in enumerate(range(-18, 18, 9)))
    b += rect(-16, -6.5, 32, 7, rx='2.2', fill='#F2C14E', stroke='#8A6200', stroke_width='.6') + ''.join(circ(x, -3, 1.1, fill='#8A6200') for x in (-9, 0, 9))
    b += grelot(-39.5, -3.5) + grelot(39.5, -3.5) + grelot(5.6, -45.5)
    fx2 = svg(g(b, transform='translate(192 51)'))
    css = "& > .plq > i::after{ transform-origin:80% 85%; }"
    return dict(id='bouffon', label='Bouffon', pa='#1C0A12', pb='#6B1226', art=art, fx1=('fall', fx1, dict(k=2, dur=12, up=True)),
                fx2=('still', fx2, dict(extra='plqTilt 1.1s ease-in-out infinite alternate')), css=css)


# ================================================================ PLAQUES DU 23 NOVEMBRE 2026 : Koï, Soleil rouge, Nuages
# Dessins originaux, d'après trois motifs traditionnels choisis par Aki : deux carpes koï autour du yin et du yang,
# un soleil en spirale aux rayons de flamme, des nuages porte-bonheur (comme dans l'art chinois).
# Le motif principal est centré sur x = 190 de la fenêtre. Les calques qui tournent sont des CARRÉS (aussi hauts que la plaque)
# posés exactement sur ce centre : ils peuvent ainsi tourner sur eux-mêmes, quelle que soit la taille de la plaque.
def carre(cx=190):
    """Les réglages d'un calque carré centré sur x = cx de la fenêtre (le décalage est compté en largeurs du carré)."""
    dec = ((W - cx) / H - .5) * 100
    return f'left:auto; width:auto; aspect-ratio:1/1; transform:translateX(-{dec:.3f}%);', f'translateX(-{dec:.3f}%)'


def courbe(points, closed=True):
    return smooth(points, closed=closed)


# ---------------------------------------------------------------- Koï : une carpe blanche et une carpe noire qui tournent autour du yin et du yang, sur du papier de riz
ENCRE, PAPIER = '#1B1511', '#FBF7EE'


def koi_dessin(R=19.0, L=49.0, W0=3.4, t=0.0, a0=-1.05):
    """Une carpe vue de dessus, couchée le long d'un cercle de rayon R autour de (30, 30).
    s = position le long du corps (0 = le nez, L = le bout de la queue) ; y = écart vers l'extérieur du cercle.
    t = la phase de la nage (de 0 à 1) : une onde passe du nez vers la queue.
    Le corps prend la couleur de remplissage du <use> qui le pose (fill), et les petits traits intérieurs sa couleur de texte (color) :
    le même dessin fait une carpe blanche (fill papier, color encre) et une carpe noire (fill encre, color papier)."""
    Lb = L * .6                       # la fin du corps (le reste est la queue)
    lam, A = L * 1.05, 2.0

    def onde(s):
        return A * (s / L) ** 2 * math.sin(2 * math.pi * (s / lam - t))

    def P(s, y):
        th = a0 + s / R
        rr = R + y + onde(s)
        return (30 + rr * math.cos(th), 30 + rr * math.sin(th))

    def larg(s):
        u = min(max(s / Lb, 0), 1)
        return W0 * (1.9 * math.sqrt(u) * (1 - u) + .15 * u * u) / .748

    def seg(a, b):
        return f'M{n(a[0])} {n(a[1])}L{n(b[0])} {n(b[1])}'

    ss = [Lb * (i / 12) ** 1.3 for i in range(13)]
    corps = courbe([P(s, larg(s)) for s in ss] + [P(s, -larg(s)) for s in reversed(ss)])
    # la queue : deux longues voiles souples avec un creux au milieu ; elles ondulent un peu plus que le corps
    wp, T, Lq = larg(Lb), 5.9, L - Lb
    fl = 1.1 * math.sin(2 * math.pi * (1.15 - t))
    queue = courbe([P(Lb - .8, wp * .9), P(Lb + Lq * .3, wp + 1.6), P(Lb + Lq * .78, T + fl * .7), P(L + .4, T - .6 + fl),
                    P(Lb + Lq * .62, .9 + fl * .45),
                    P(L - .6, -T + 1.2 + fl), P(Lb + Lq * .74, -T + .2 + fl * .7), P(Lb + Lq * .28, -wp - 1.5), P(Lb - .8, -wp * .9)])
    traits = ''.join(seg(P(Lb + 1.4, k * .5), P(Lb + Lq * (.72 if abs(k) < 2 else .62), k * 2.1 + fl * .8)) for k in (-2.5, -1.2, 0, 1.2, 2.5))
    # les nageoires de côté : de grands éventails arrondis qui battent doucement, et deux plus petites au milieu du corps
    nag = ''
    for s0, ta0, ph in ((Lb * .25, 1.25, 0), (Lb * .66, .7, .3)):
        for side in (1, -1):
            ta = ta0 if side > 0 else ta0 * .58      # côté intérieur : plus petites, pour ne jamais toucher le yin et le yang
            bat = .6 * math.sin(2 * math.pi * (t + ph + (0 if side > 0 else .5)))
            w = larg(s0)
            pts_ = [(s0 - .6, w * .9), (s0 + .4 * ta, w + (2.9 + bat) * ta), (s0 + 2.6 * ta, w + (4.8 + bat) * ta), (s0 + 5 * ta, w + (4.3 + bat) * ta),
                    (s0 + 5.8 * ta, w + (2.2 + bat * .5) * ta), (s0 + 3.2 * ta, w * .95)]
            nag += courbe([P(s, side * y) for s, y in pts_])
            traits += seg(P(s0 + .3, side * w), P(s0 + 2.4 * ta, side * (w + (4.2 + bat) * ta))) + seg(P(s0 + 1.3, side * w), P(s0 + 4.4 * ta, side * (w + (3.4 + bat * .8) * ta)))
    dos = 'M' + 'L'.join(f'{n(x)} {n(y)}' for x, y in (P(s, 0) for s in (Lb * .32, Lb * .55, Lb * .78, Lb * .96)))
    yeux = ''.join(circ(*P(Lb * .1, k * larg(Lb * .1) * .6), .55) for k in (1, -1))
    contour = dict(stroke=ENCRE, stroke_width='.8', stroke_linejoin='round')
    return (path(queue, **contour) + path(nag, **contour) + path(traits, fill='none', stroke='currentColor', stroke_width='.35', stroke_opacity='.65')
            + path(corps, **contour) + path(dos, fill='none', stroke='currentColor', stroke_width='.45', stroke_opacity='.5', stroke_linecap='round')
            + circ(*P(Lb * .17, 0), 1.45, fill='#C8302A') + g(yeux, fill='currentColor'))


def yin_yang(cx, cy, r, c1, c2, rot=0):
    h = r / 2
    moitie = (f'M{n(cx)} {n(cy - r)}A{n(r)} {n(r)} 0 0 1 {n(cx)} {n(cy + r)}A{n(h)} {n(h)} 0 0 1 {n(cx)} {n(cy)}'
              f'A{n(h)} {n(h)} 0 0 0 {n(cx)} {n(cy - r)}Z')
    body = circ(cx, cy, r, fill=c2) + path(moitie, fill=c1) + circ(cx, cy + h, r * .15, fill=c2) + circ(cx, cy - h, r * .15, fill=c1)
    return g(body, transform=f'rotate({rot} {n(cx)} {n(cy)})') + circ(cx, cy, r + .35, fill='none', stroke=ENCRE, stroke_width='.9')


@plaque
def koi():
    r = rnd(23)
    cx, cy = 190, 30
    # le papier : quelques fibres et des points, un lavis d'encre très léger derrière le yin et le yang, des ronds dans l'eau
    fib = ''
    for i in range(16):
        x, y, L_, a = 50 + r.random() * 190, r.random() * 60, 4 + r.random() * 9, (r.random() - .5) * .9
        fib += f'M{n(x)} {n(y)}q{n(L_ * .5 * math.cos(a))} {n(L_ * .5 * math.sin(a) + (r.random() - .5) * 2)} {n(L_ * math.cos(a))} {n(L_ * math.sin(a))}'
    body = path(fib, fill='none', stroke='#B9A27A', stroke_width='.35', stroke_opacity='.45', stroke_linecap='round')
    body += g(''.join(circ(40 + r.random() * 200, r.random() * 60, .3 + r.random() * .3) for i in range(20)), fill='#9C8460', opacity='.3')
    body += circ(cx, cy, 30, fill='url(#lav)')
    for rr, op in ((26.5, .2), (33, .13), (40, .08)):
        body += circ(cx, cy, rr, fill='none', stroke=ENCRE, stroke_width='.55', stroke_opacity=n2(op))
    body += yin_yang(cx, cy, 9.4, '#C8302A', ENCRE, rot=32)
    art = svg(body, defs=rad('lav', [(0, '#6B5A45', .22), (.55, '#6B5A45', .08), (1, '#6B5A45', 0)]))
    # un rond dans l'eau, qui part du yin et du yang et s'efface
    onde = svg(circ(30, 30, 14, fill='none', stroke=ENCRE, stroke_width='.7', stroke_opacity='.55'), 60, 60)
    # les deux carpes, image par image : elles nagent (4 images) pendant que tout le calque tourne autour du centre
    defs = ''.join(g(koi_dessin(t=i / 4), id=f'k{i}') for i in range(4))
    fr = [f"<use href='#k{i}' fill='{PAPIER}' color='{ENCRE}'/><use href='#k{i}' transform='rotate(180 30 30)' fill='{ENCRE}' color='{PAPIER}'/>" for i in range(4)]
    carpes = frames(fr, 60, 60, defs=defs)
    base, tr = carre(cx)
    css = ("&{ --pts:0 0 2px #FBF7EE, 0 0 5px rgba(251,247,238,.95); }\n"   # un halo couleur papier : le texte foncé reste lisible même sur la carpe noire
           f"& > .plq > i::before{{ transform:{tr} scale(1.25); opacity:.4; }}\n"
           f"&! > .plq > i::before{{ animation:plqKoiOnde 3.6s cubic-bezier(.2,.6,.35,1) infinite; }}\n"
           f"@keyframes plqKoiOnde{{ from{{ transform:{tr} scale(.78); opacity:.75; }} to{{ transform:{tr} scale(1.95); opacity:0; }} }}\n"
           f"@keyframes plqKoiTour{{ from{{ transform:{tr} rotate(0deg); }} to{{ transform:{tr} rotate(-360deg); }} }}\n"
           f"@supports not (aspect-ratio:1){{ & > .plq > i::before, & > .plq > i::after{{ width:25%; }} }}")
    return dict(id='koi', label='Koï', pa='#F1E7D3', pb='#E3D2B1', tx='#1C1410', art=art,
                fx1=('still', onde, dict(css=base + ' background-size:100% 100%; background-position:center;')),
                fx2=('anim', carpes, dict(nb=4, dur=.9, extra=', plqKoiTour 26s linear infinite', css=base)), css=css)


# ---------------------------------------------------------------- Soleil rouge : des rayons en flammes qui tournent lentement, une spirale qui tourne en sens inverse
def rayon(th, r0, Lr, bw, r, cx=30, cy=30, vague=2.1):
    """Un rayon en forme de flamme ondulée : large à la base, effilé au bout, avec quelques irrégularités de pinceau."""
    ux, uy = math.cos(th), math.sin(th)            # vers l'extérieur
    tx, ty = -uy, ux                                # sur le côté
    gauche, droite = [], []
    N = 7
    for k in range(N + 1):
        t = k / N
        rho = r0 + t * (Lr - r0)
        d = vague * math.sin(2 * math.pi * t * .9) * t ** .6
        w = bw * (1 - t) ** .85 * (1 + .3 * math.sin(math.pi * t))
        jx = (r.random() - .5) * .35 if 0 < k < N else 0
        mx, my = cx + rho * ux + d * tx, cy + rho * uy + d * ty
        gauche.append((mx + (w + jx) * tx, my + (w + jx) * ty))
        droite.append((mx - (w - jx) * tx, my - (w - jx) * ty))
    return courbe(gauche + list(reversed(droite))[1:])


def spirale(rmax=10.1, tours=2.2, cx=30, cy=30, pas=.42):
    """Une spirale au pinceau : fine au centre, épaisse au bord."""
    tm = tours * 2 * math.pi
    ext, inn = [], []
    k = 0
    while True:
        th = min(k * pas, tm)
        u = th / tm
        rr, w = 1.1 + (rmax - 1.1) * u, .55 + 2.1 * u
        ext.append((cx + (rr + w / 2) * math.cos(th), cy + (rr + w / 2) * math.sin(th)))
        inn.append((cx + max(rr - w / 2, .2) * math.cos(th), cy + max(rr - w / 2, .2) * math.sin(th)))
        if th >= tm:
            break
        k += 1
    return courbe(ext + list(reversed(inn)))


@plaque
def soleil():
    r = rnd(31)
    cx = 190
    # le fond : une grande lueur derrière le soleil, des cercles de chaleur, quelques braises immobiles
    body = circ(cx, 30, 38, fill='url(#lu)') + circ(cx, 30, 19, fill='url(#co)')
    for rr, op in ((31, .14), (37, .09), (44, .05)):
        body += circ(cx, 30, rr, fill='none', stroke='#FF7A3A', stroke_width='.6', stroke_opacity=n2(op))
    body += g(''.join(circ(70 + r.random() * 170, r.random() * 60, .3 + r.random() * .5) for i in range(16)), fill='#FFB070', opacity='.35')
    art = svg(body, defs=rad('lu', [(0, '#FF6A2E', .55), (.45, '#E2361E', .2), (1, '#E2361E', 0)]) + rad('co', [(0, '#FFC27A', .32), (1, '#FF6A2E', 0)]))
    # les rayons : dix flammes, longues et courtes, et des points entre elles
    N, ray, pts_ = 10, '', ''
    for i in range(N):
        th = -math.pi / 2 + i * 2 * math.pi / N
        long_ = i % 2 == 0
        ray += rayon(th, 12.5, 28.6 if long_ else 24.2, 2.7 if long_ else 2.05, r, vague=2.2 if long_ else 1.7)
        a = th + math.pi / N
        pts_ += circ(30 + 15.4 * math.cos(a), 30 + 15.4 * math.sin(a), .85)
        if not long_:
            pts_ += circ(30 + 22.6 * math.cos(a), 30 + 22.6 * math.sin(a), .7)
    d1 = "<radialGradient id='rg' gradientUnits='userSpaceOnUse' cx='30' cy='30' r='29'><stop offset='.42' stop-color='#FFB25E'/><stop offset='.64' stop-color='#F2552F'/><stop offset='1' stop-color='#B21E18'/></radialGradient>"
    rayons = svg(path(ray, fill='url(#rg)') + g(pts_, fill='#FF9A55'), 60, 60, d1)
    # la spirale du centre
    d2 = "<radialGradient id='sg' gradientUnits='userSpaceOnUse' cx='30' cy='30' r='13'><stop offset='0' stop-color='#FFC98A'/><stop offset='.4' stop-color='#FF7E3F'/><stop offset='1' stop-color='#E3381F'/></radialGradient>"
    # la spirale tourne dans un anneau, d'où partent les rayons
    spi = svg(circ(30, 30, 12.6, fill='none', stroke='url(#sg)', stroke_width='1.6') + path(spirale(), fill='url(#sg)') + circ(30, 30, 1.3, fill='#FFD49A'), 60, 60, d2)
    base, tr = carre(cx)
    # les rayons tournent en 48 s et « respirent » 6 fois par tour ; la spirale tourne en sens inverse
    pas = ' '.join(f"{n2(100 * k / 12)}%{{ transform:{tr} rotate({30 * k}deg) scale({'1.06' if k % 2 else '1'}); }}" for k in range(13))
    css = ("&{ --pts:0 1px 2px rgba(0,0,0,.65), 0 0 7px rgba(20,8,7,.75); }\n"   # un halo sombre : le texte blanc reste lisible devant le soleil
           f"@keyframes plqSoleilR{{ {pas} }}\n"
           f"@keyframes plqSoleilS{{ from{{ transform:{tr} rotate(0deg); }} to{{ transform:{tr} rotate(-360deg); }} }}\n"
           f"@supports not (aspect-ratio:1){{ & > .plq > i::before, & > .plq > i::after{{ width:25%; }} }}")
    return dict(id='soleil', label='Soleil rouge', pa='#140807', pb='#3E0F0A', bg='linear-gradient(100deg,#140807 30%,#2A0B08 62%,#4A140C)', art=art,
                fx1=('still', rayons, dict(css=base, extra='plqSoleilR 48s linear infinite')),
                fx2=('still', spi, dict(css=base, extra='plqSoleilS 11s linear infinite')), css=css)


# ---------------------------------------------------------------- Nuages : des nuages porte-bonheur rouges qui passent devant un soleil d'or, sur un ciel de jade
def traine(x, y, L, e0, amp, plus=0):
    """La traîne d'un nuage : épaisse contre le nuage, effilée au bout, avec un petit crochet vers le haut."""
    haut, bas = [], []
    for k in range(9):
        t = k / 8
        cx, cy = x - L * t, y + amp * math.sin(math.pi * t * 1.15) - 4.2 * t ** 3
        e = e0 * (1 - t) ** .9 + .35
        haut.append((cx, cy - e / 2 - plus))
        bas.append((cx, cy + e / 2 + plus))
    return courbe(haut + list(reversed(bas)))


def nuage_xiangyun(lobes, fond, bord, volute, ep=1.1, queue=None):
    """Un nuage porte-bonheur fait de boucles (x, y, rayon), posées sur une base arrondie, avec une traîne (facultative).
    Le bord est le même nuage, un peu plus gros, posé dessous ; chaque boucle porte une volute qui s'enroule vers le centre."""
    xs, rs = [x for x, y, rr in lobes], [rr for x, y, rr in lobes]

    def silhouette(plus):
        o = ''.join(circ(x, y, rr + plus) for x, y, rr in lobes)
        o += ell((min(xs) + max(xs)) / 2, max(y + rr * .35 for x, y, rr in lobes), (max(xs) - min(xs)) / 2 + 1.5 + plus, min(rs) * .72 + plus)
        if queue:
            o += path(traine(*queue, plus=plus))
        return o
    vol = ''
    for x, y, rr in lobes:
        pts_ = [(x + rr * (.72 - k * .045) * math.cos(-1.9 + k * .42), y + rr * (.72 - k * .045) * math.sin(-1.9 + k * .42)) for k in range(15)]
        vol += courbe(pts_, closed=False)
    return ((g(silhouette(ep), fill=bord) if bord else '') + g(silhouette(0), fill=fond)
            + path(vol, fill='none', stroke=volute, stroke_width='.85', stroke_linecap='round'))


@plaque
def nuages_porte_bonheur():
    # le ciel : un soleil d'or entouré d'un halo, et deux traînées de brume
    d = rad('ha', [(0, '#F7D27A', .55), (.5, '#F2B84B', .16), (1, '#F2B84B', 0)]) + lin('or', [(0, '#FFF0B8'), (1, '#F0B348')])
    body = circ(203, 24, 34, fill='url(#ha)') + circ(203, 24, 15, fill='url(#or)') + circ(203, 24, 15, fill='none', stroke='#FFF6D6', stroke_width='.6', stroke_opacity='.6')
    body += path('M70 44Q130 38 186 44T240 42', fill='none', stroke='#E9F3EC', stroke_width='1.2', stroke_opacity='.08', stroke_linecap='round')
    body += path('M96 52Q150 47 206 52T240 50', fill='none', stroke='#E9F3EC', stroke_width='.9', stroke_opacity='.07', stroke_linecap='round')
    art = svg(body, defs=d)
    grad = "<linearGradient id='ro' gradientUnits='userSpaceOnUse' x1='0' y1='20' x2='0' y2='49'><stop offset='0' stop-color='#EA553F'/><stop offset='1' stop-color='#B3261D'/></linearGradient>"
    # au loin : des petits nuages pâles qui glissent lentement (hors du coin du pseudo)
    loin = (nuage_xiangyun([(150, 14, 3.6), (157, 11, 4.6), (164, 14, 3.4)], '#5E9C8F', None, '#C4E4DA')
            + nuage_xiangyun([(226, 50, 3.8), (234, 47, 4.8), (242, 50, 3.6)], '#5E9C8F', None, '#C4E4DA'))
    fx1 = svg(boucle_x(g(loin, opacity='.6'), 240), W, 60)
    # devant : un grand nuage porte-bonheur devant le soleil, puis un plus petit qui arrive plus tard.
    # Ce calque fait deux fenêtres de large (480) : à l'arrêt on voit sa moitié droite (le grand nuage seul, loin du pseudo),
    # le petit nuage n'entre qu'avec le mouvement.
    pres = (nuage_xiangyun([(412, 37, 6.8), (423, 31, 8.6), (436, 29, 9.6), (449, 32, 8.4), (459, 38, 6.4)], 'url(#ro)', '#F2C14E', '#FFEBD0', 1.15,
                           queue=(418, 40.8, 42, 5.2, 1.6))
            + nuage_xiangyun([(150, 42, 5), (158, 38, 6.4), (168, 40, 5.2)], 'url(#ro)', '#F2C14E', '#FFEBD0', 1, queue=(154, 44.5, 28, 3.8, 1.2)))
    fx2 = svg(boucle_x(pres, 480), 2 * W, 60, grad)
    css = "&{ --pts:0 1px 2px rgba(0,0,0,.6), 0 0 7px rgba(6,26,24,.7); }"   # un halo sombre : le texte blanc reste lisible devant les nuages
    return dict(id='nuages', label='Nuages', css=css, pa='#0A2522', pb='#1B5A52', bg='linear-gradient(100deg,#0A2522 30%,#134540 62%,#1F6359)', art=art,
                fx1=('drift', fx1, dict(k=1, dur=46)), fx2=('drift', fx2, dict(k=2, dur=42)))
