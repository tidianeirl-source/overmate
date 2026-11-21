# Fabrique la feuille de style des plaques nominatives de Coopô (plaques.css) et une page de contrôle (galerie.html, à ouvrir dans le navigateur).
#   python3 atelier/plaques/gen.py            puis   python3 atelier/plaques/poser.py   pour la remettre dans index.html
# Tous les dessins sont ORIGINAUX : ils sont décrits ici, forme par forme, puis rangés dans la feuille de style (aucune image extérieure).
import math, os, sys
from outils import *
import dessins

ICI = os.path.dirname(os.path.abspath(__file__))

TEXTE = '.plq-on.plq-on, ' + ', '.join('.plq-on.plq-on ' + x for x in ['b', 'strong', 'h1', 'h2', 'h3', 'small', 'em', '.muted', '.online', '.mc-name', '.me-name', '.me-stats', '.rejoue', '.plq-t', '.sn-st', '.x']) + '{ color:var(--ptx) !important; text-shadow:var(--pts,0 1px 2px rgba(0,0,0,.5)) !important; -webkit-text-fill-color:currentColor; }'

BASE = r'''
/* ==== Plaques nominatives, façon Discord ====
   Une plaque = un bandeau décoré DERRIÈRE toute la ligne d'un joueur (photo, pseudo, statut) : une couleur de fond, un dessin à droite
   qui s'efface vers la gauche, et une animation qui ne joue que quand on passe la souris sur la ligne (ou là où la plaque est mise en avant, avec la
   classe .plq-live : profil, en-tête d'une conversation, boutique). Le reste du temps la plaque est une image fixe : elle ne coûte rien au téléphone.
   Chaque plaque apporte son fond ET sa couleur de texte : le pseudo reste lisible dans tous les thèmes.
     .plq-on.pq-<nom>  la ligne qui porte la plaque (c'est elle qui fixe les couleurs --pa, --pb et --ptx)
     .plq              le bandeau, glissé en premier dans la ligne          .plq > i   la « fenêtre » du dessin, collée à droite
   Les dessins sont originaux. Ils sont décrits dans atelier/plaques/dessins.py, et ce bloc est fabriqué par atelier/plaques/gen.py (voir le LISEZ-MOI de ce dossier) :
   pour changer une plaque, on modifie son dessin là-bas puis on relance gen.py et poser.py, plutôt que de retoucher ce bloc à la main. */
.plq-on{ --pa:#2A2D3A; --pb:#4A5070; --ptx:#fff; position:relative; isolation:isolate; }
.plq{ position:absolute; top:var(--plq-y,0); bottom:var(--plq-y,0); left:var(--plq-x,0); right:var(--plq-x,0); z-index:-1; overflow:hidden; border-radius:var(--plq-r,inherit); pointer-events:none; background:linear-gradient(100deg,var(--pa) 30%,var(--pb)); transition:filter .2s; }
.plq-on:hover > .plq{ filter:brightness(1.07) saturate(1.05); }
.plq::before{ content:''; position:absolute; left:0; top:0; width:100%; height:100%; z-index:3; border-radius:inherit; box-shadow:inset 0 0 0 1px rgba(255,255,255,.13), inset 0 1px 0 rgba(255,255,255,.15); }
.plq::after{ content:''; position:absolute; left:0; top:0; width:100%; height:100%; z-index:2; background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.2) 50%,transparent 58%); transform:translateX(-120%); }
.plq-on:is(:hover,:focus-visible,.plq-live) > .plq::after{ animation:plqShine 5s ease-in-out infinite; }
.plq > i{ position:absolute; top:0; right:0; height:100%; aspect-ratio:4/1; max-width:74%; overflow:hidden; background:var(--art,none) right center/auto 100% no-repeat;
  -webkit-mask-image:linear-gradient(90deg,transparent,rgba(0,0,0,.55) 36%,#000 68%); mask-image:linear-gradient(90deg,transparent,rgba(0,0,0,.55) 36%,#000 68%); }
@supports not (aspect-ratio:1){ .plq > i{ width:62%; } }
.plq > i::before, .plq > i::after{ content:''; position:absolute; left:0; right:0; top:0; height:100%; background-repeat:no-repeat; background-position:right center; background-size:auto 100%; }
/* le texte posé sur une plaque */
@@TEXTE@@
.plq-on.plq-on .muted, .plq-on.plq-on .sn-st{ opacity:.86; }
/* le pseudo seul dans un petit bandeau : là où il n'y a pas de ligne (message d'un groupe, phrase) */
.plq-chip{ display:inline-flex; align-items:center; max-width:100%; min-width:0; min-height:1.8em; padding:.14em 4.4em .16em .62em; border-radius:.5em; font-weight:700; line-height:1.3; vertical-align:middle; text-transform:none; letter-spacing:0; }
.plq-chip > .plq > i{ max-width:5.4em; }
.plq-t{ position:relative; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* les mouvements */
@keyframes plqShine{ 0%,62%{ transform:translateX(-120%); } 100%{ transform:translateX(120%); } }
@keyframes plqPulse{ to{ opacity:.25; } }
@keyframes plqBob{ to{ transform:translateY(-5%); } }
@keyframes plqTilt{ from{ transform:rotate(-5deg); } to{ transform:rotate(5deg); } }
'''

KEYS = {}        # animations fabriquées à la demande (une par durée de boucle utile)
ACTIF = ':is(:hover,:focus-visible,.plq-live)'    # la plaque est « active » : on passe dessus, ou elle est mise en avant


def kf(name, body):
    KEYS[name] = f'@keyframes {name}{{ {body} }}'
    return name


def pct(k):
    return f'{100 * k / (k + 1):.3f}'.rstrip('0').rstrip('.')


# Chaque fabrique rend deux choses : les réglages fixes du calque, et son animation (posée seulement quand la plaque est active).
def fall(u, k=2, dur=4, up=False, extra=''):
    """Un motif qui défile de haut en bas (ou de bas en haut) sans couture. k = hauteur du motif, en hauteurs de fenêtre."""
    name = kf(f'plqY{k}{"u" if up else ""}', f'to{{ transform:translateY({"-" if up else ""}{pct(k)}%); }}')
    top = '0' if up else f'-{100 * k}%'
    return f'top:{top}; height:{100 * (k + 1)}%; background:{u} right top/auto {pct(k)}% repeat-y;', f'{name} {dur}s linear infinite{extra}'


def drift(u, k=2, dur=12, left=True, extra=''):
    """Un motif qui glisse sur le côté sans couture. k = largeur du motif, en largeurs de fenêtre."""
    if left:
        name = kf(f'plqX{k}l', f'from{{ transform:translateX({pct(k)}%); }} to{{ transform:none; }}')
    else:
        name = kf(f'plqX{k}r', f'from{{ transform:none; }} to{{ transform:translateX({pct(k)}%); }}')
    return f'left:auto; right:0; aspect-ratio:{4 * (k + 1)}/1; background:{u} right center/auto 100% repeat-x;', f'{name} {dur}s linear infinite{extra}'


def anim(u, nb, dur, extra=''):
    """Un dessin animé image par image : nb images empilées, montrées l'une après l'autre."""
    end = f'{100 * nb / (nb - 1):.3f}'.rstrip('0').rstrip('.')
    name = kf(f'plqF{nb}', f'to{{ background-position:100% {end}%; }}')
    return f'background:{u} right 0/auto {100 * nb}% no-repeat;', f'{name} {dur}s steps({nb}) infinite{extra}'


def still(u, extra=''):
    return f'background-image:{u};', extra


def img(v):
    """L'image d'un calque : un dessin propre à la plaque, ou une image partagée par plusieurs plaques (rangée une seule fois)."""
    return f'var(--c-{v.nom})' if isinstance(v, dessins.Commun) else uri(v)


def css_for(p):
    """La feuille de style d'une plaque, à partir de sa fiche (voir dessins.py)."""
    pid = p['id']
    head = f"--pa:{p['pa']}; --pb:{p['pb']};"
    if p.get('tx'):
        head += f" --ptx:{p['tx']};"
    if p.get('tx'):
        head += " --pts:0 1px 0 rgba(255,255,255,.45); --pbt:rgba(255,255,255,.5);"
    if p.get('art'):
        head += f" --art:{img(p['art'])};"
    out = [f".pq-{pid}{{ {head} }}"]
    if p.get('bg'):
        out.append(f".pq-{pid} > .plq{{ background:{p['bg']}; }}")
    for key, sel in (('fx1', '> .plq > i::before'), ('fx2', '> .plq > i::after')):
        fx = p.get(key)
        if not fx:
            continue
        kind, a = fx[0], fx[1:]
        opt = dict(a[1]) if len(a) > 1 else {}
        plus = opt.pop('css', '')
        fab = {'fall': fall, 'drift': drift, 'anim': anim, 'still': still}[kind]
        decl, mouv = fab(img(a[0]), **opt)
        out.append(f".pq-{pid} {sel}{{ {decl}{' ' + plus if plus else ''} }}")
        if mouv:
            out.append(f".pq-{pid}{ACTIF} {sel}{{ animation:{mouv}; }}")
    if p.get('css'):
        out.append(p['css'].replace('&!', f'.pq-{pid}{ACTIF}').replace('&', f'.pq-{pid}'))
    return '\n'.join(out)


END = r'''
/* mode économie et « moins d'animations » : les plaques restent fixes */
html.lite .plq, html.lite .plq::after, html.lite .plq > i, html.lite .plq > i::before, html.lite .plq > i::after{ animation:none !important; }
@media (prefers-reduced-motion:reduce){ .plq, .plq::after, .plq > i, .plq > i::before, .plq > i::after{ animation:none !important; } }
'''


def build(only=None):
    plates = dessins.toutes()
    if only:
        plates = [p for p in plates if p['id'] in only]
    parts = [css_for(p) for p in plates]
    communs = '.plq-on{ ' + ' '.join(f'--c-{k}:{uri(v)};' for k, v in dessins.COMMUNS.items()) + ' }'
    css = BASE.strip('\n').replace('@@TEXTE@@', TEXTE) + '\n' + '\n'.join(KEYS.values()) + '\n' + communs + '\n' + '\n'.join(parts) + '\n' + END.strip('\n') + '\n'
    return css, plates


def galerie(css, plates):
    rows = ''
    for p in plates:
        pid, lab = p['id'], p.get('label', p['id'])
        def row(cls, live, h, av):
            return (f'<div class="row {cls} plq-on pq-{pid}{" plq-live" if live else ""}" style="min-height:{h}px"><i class="plq"><i></i></i>'
                    f'<span class="av" style="width:{av}px;height:{av}px"></span><div><b>{lab}</b><span class="muted">En ligne · {pid}</span></div></div>')
        rows += (f'<section><h4>{lab} <small>{pid} · {len(css_for(p)) // 1024} Ko</small></h4><div class="grid">'
                 + row('r50', False, 50, 36) + row('r50', True, 50, 36) + row('r78', False, 78, 56) + row('r78', True, 78, 56)
                 + f'<div class="chips"><span class="plq-chip plq-on pq-{pid}"><i class="plq"><i></i></i><span class="plq-t">{lab}</span></span>'
                 + f'<span class="plq-chip plq-on pq-{pid} plq-live" style="font-size:26px"><i class="plq"><i></i></i><span class="plq-t">{lab}</span></span></div>'
                 + '</div></section>')
    html = f'''<!doctype html><meta charset="utf-8"><title>Plaques</title><style>
body{{ margin:0; padding:18px; font:15px/1.3 system-ui,sans-serif; background:#ECEEF5; color:#1B1D2A; }}
h4{{ margin:14px 0 6px; font-size:14px; }} h4 small{{ font-weight:400; opacity:.6; }}
.grid{{ display:grid; grid-template-columns:300px 300px 393px 393px; gap:10px; align-items:start; }}
.chips{{ grid-column:1 / -1; display:flex; gap:14px; align-items:center; }}
.row{{ display:grid; grid-template-columns:auto 1fr; gap:10px; align-items:center; padding:7px 8px; border-radius:12px; }}
.row > div{{ display:grid; line-height:1.25; }} .row b{{ font-size:15px; }} .row .muted{{ font-size:12px; }}
.r78{{ padding:11px 14px; gap:12px; }} .r78 b{{ font-size:17px; }} .r78 .muted{{ font-size:13px; }}
.av{{ border-radius:50%; background:linear-gradient(135deg,#B06CF5,#E23BC1); display:block; }}
{css}</style>{rows}'''
    return html


if __name__ == '__main__':
    only = [a for a in sys.argv[1:] if not a.startswith('-')] or None
    css, plates = build(only)
    open(os.path.join(ICI, 'plaques.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(ICI, 'galerie.html'), 'w', encoding='utf-8').write(galerie(css, plates))
    print(f'{len(plates)} plaques · feuille de style : {len(css) / 1024:.1f} Ko')
    for p in plates:
        print(f"  {p['id']:<12} {len(css_for(p)) / 1024:5.1f} Ko")
