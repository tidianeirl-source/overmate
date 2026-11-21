# Remet la feuille de style des plaques dans index.html.   À lancer après gen.py :
#   python3 atelier/plaques/gen.py && python3 atelier/plaques/poser.py
# Le script remplace seulement le morceau de la page qui va du titre « Plaques nominatives, façon Discord » jusqu'au titre « Boutique ».
import os
ICI = os.path.dirname(os.path.abspath(__file__))
page = os.path.join(ICI, '..', '..', 'index.html')
t = open(page, encoding='utf-8').read()
a = t.index('/* ==== Plaques nominatives, façon Discord ====')
b = t.index('\n/* ==== Boutique ==== */')
assert a < b, 'les deux repères ne sont pas dans le bon ordre'
css = open(os.path.join(ICI, 'plaques.css'), encoding='utf-8').read().strip('\n')
ctx = open(os.path.join(ICI, 'contexte.css'), encoding='utf-8').read().strip('\n')
neuf = t[:a] + css + '\n' + ctx + '\n' + t[b:]
if neuf == t:
    print('index.html est déjà à jour')
else:
    open(page, 'w', encoding='utf-8').write(neuf)
    print(f'index.html mis à jour ({len(neuf) / 1024:.0f} Ko)')
