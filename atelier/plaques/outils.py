# Outils de dessin pour les plaques nominatives de Coopô.
# Chaque dessin est un petit SVG (une image faite de formes), écrit ici en Python puis rangé dans la feuille de style du site.
import math, random

W, H = 240, 60          # la « fenêtre » du dessin, à droite de la plaque : 4 fois plus large que haute


def n(v):
    """Un nombre écrit court (1 chiffre après la virgule, sans zéro inutile)."""
    s = f'{v:.1f}'
    if s.endswith('.0'):
        s = s[:-2]
    if s == '-0':
        s = '0'
    return s


def svg(body, w=W, h=H, defs=''):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {n(w)} {n(h)}' width='{n(w)}' height='{n(h)}'>"
            + (f"<defs>{defs}</defs>" if defs else '') + body + "</svg>")


def uri(s):
    """Le SVG sous forme d'adresse « data: », utilisable comme image de fond en CSS."""
    s = ' '.join(s.split()).replace('> <', '><')
    assert '"' not in s, 'guillemets doubles interdits dans un dessin'
    s = s.replace('%', '%25').replace('#', '%23').replace('<', '%3C').replace('>', '%3E')
    return 'url("data:image/svg+xml,' + s + '")'


def pts(points):
    return ' '.join(f'{n(x)},{n(y)}' for x, y in points)


def poly(points, **a):
    return f"<polygon points='{pts(points)}'{attrs(a)}/>"


def attrs(a):
    out = ''
    for k, v in a.items():
        if v is None:
            continue
        k = k.rstrip('_').replace('_', '-')
        out += f" {k}='{v}'"
    return out


def el(tag, **a):
    return f"<{tag}{attrs(a)}/>"


def g(body, **a):
    return f"<g{attrs(a)}>{body}</g>"


def circ(cx, cy, r, **a):
    return f"<circle cx='{n(cx)}' cy='{n(cy)}' r='{n(r)}'{attrs(a)}/>"


def rect(x, y, w, h, **a):
    return f"<rect x='{n(x)}' y='{n(y)}' width='{n(w)}' height='{n(h)}'{attrs(a)}/>"


def path(d, **a):
    return f"<path d='{d}'{attrs(a)}/>"


def star_d(cx, cy, R, r=None, k=5, rot=-90):
    """Le tracé d'une étoile à k branches."""
    r = R * 0.45 if r is None else r
    p = []
    for i in range(2 * k):
        a = math.radians(rot + i * 180 / k)
        rad = R if i % 2 == 0 else r
        p.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return 'M' + 'L'.join(f'{n(x)} {n(y)}' for x, y in p) + 'Z'


def sparkle_d(cx, cy, R, k=0.16, ry=None):
    """Un éclat à 4 branches fines (comme un reflet de lumière)."""
    ry = R if ry is None else ry
    a, b = R * k, ry * k
    return (f"M{n(cx)} {n(cy - ry)}Q{n(cx + a)} {n(cy - b)} {n(cx + R)} {n(cy)}Q{n(cx + a)} {n(cy + b)} {n(cx)} {n(cy + ry)}"
            f"Q{n(cx - a)} {n(cy + b)} {n(cx - R)} {n(cy)}Q{n(cx - a)} {n(cy - b)} {n(cx)} {n(cy - ry)}Z")


def lin(id_, stops, x1=0, y1=0, x2=0, y2=1, units=None):
    u = f" gradientUnits='{units}'" if units else ''
    return (f"<linearGradient id='{id_}' x1='{n(x1)}' y1='{n(y1)}' x2='{n(x2)}' y2='{n(y2)}'{u}>"
            + ''.join(f"<stop offset='{n(o)}' stop-color='{c}'" + (f" stop-opacity='{n2(op)}'" if op is not None else '') + '/>' for o, c, op in _stops(stops))
            + '</linearGradient>')


def rad(id_, stops, cx=.5, cy=.5, r=.5):
    return (f"<radialGradient id='{id_}' cx='{n2(cx)}' cy='{n2(cy)}' r='{n2(r)}'>"
            + ''.join(f"<stop offset='{n(o)}' stop-color='{c}'" + (f" stop-opacity='{n2(op)}'" if op is not None else '') + '/>' for o, c, op in _stops(stops))
            + '</radialGradient>')


def n2(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return s if s not in ('', '-0') else '0'


def _stops(stops):
    for s in stops:
        if len(s) == 2:
            yield s[0], s[1], None
        else:
            yield s


def blur(id_, sd, pad=40):
    return f"<filter id='{id_}' x='-{pad}%' y='-{pad}%' width='{100 + 2 * pad}%' height='{100 + 2 * pad}%'><feGaussianBlur stdDeviation='{n(sd)}'/></filter>"


def hsl(h, s, l, a=None):
    return f'hsl({n(h % 360)} {n(s)}% {n(l)}%)' if a is None else f'hsl({n(h % 360)} {n(s)}% {n(l)}% / {n2(a)})'


def wrap_y(body, period, w=W):
    """Répète un motif au-dessus et au-dessous, pour qu'il se raccorde sans couture quand il défile verticalement."""
    return (f"<g>{g(body, transform=f'translate(0 {-period})')}{body}{g(body, transform=f'translate(0 {period})')}</g>")


def wrap_x(body, period):
    return (f"<g>{g(body, transform=f'translate({-period} 0)')}{body}{g(body, transform=f'translate({period} 0)')}</g>")


def frames(bodies, w=W, h=H, defs=''):
    """Plusieurs images empilées dans un seul dessin : le site les montre l'une après l'autre (dessin animé image par image)."""
    out = ''
    for i, b in enumerate(bodies):
        out += f"<svg x='0' y='{n(i * h)}' width='{n(w)}' height='{n(h)}' viewBox='0 0 {n(w)} {n(h)}' overflow='hidden'>{b}</svg>"
    return svg(out, w, h * len(bodies), defs)


def rnd(seed):
    return random.Random(seed)


def smooth(points, closed=False, t=0.5):
    """Une courbe douce qui passe par les points donnés (Catmull-Rom transformé en courbes de Bézier)."""
    P = list(points)
    if closed:
        P = [P[-1]] + P + [P[0], P[1]]
    else:
        P = [P[0]] + P + [P[-1]]
    d = f'M{n(P[1][0])} {n(P[1][1])}'
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) * t / 3 * 1.0, p1[1] + (p2[1] - p0[1]) * t / 3 * 1.0)
        c2 = (p2[0] - (p3[0] - p1[0]) * t / 3 * 1.0, p2[1] - (p3[1] - p1[1]) * t / 3 * 1.0)
        d += f'C{n(c1[0])} {n(c1[1])} {n(c2[0])} {n(c2[1])} {n(p2[0])} {n(p2[1])}'
    return d + ('Z' if closed else '')
