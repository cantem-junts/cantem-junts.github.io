#!/usr/bin/env python3
"""Converteix totes les presentacions bolcades i les escriu a cancons/ del repositori.

Ús: lot.py REPOSITORI CARPETA_DE_DADES
CARPETA_DE_DADES té presentacions.json ([{titol, id, tags}], tret del TiddlyWiki
antic) i bolcats/ID.json (sortida de volcar.js). Deixa informe-lot.json al costat.
"""
import json, sys, os, re, unicodedata
sys.path.insert(0, os.path.dirname(__file__)); import convertir as c
def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')
def etiquetes(tags):
    e = []
    if 'Nadal' in tags: e.append('Nadal')
    if 'Maria' in tags or "Mare de Déu de l'Alegria" in tags: e.append('Maria')
    if 'Pasqua' in tags: e.append('Pasqua')
    return e
def main():
    REPO = sys.argv[1]
    S = sys.argv[2]
    pres = json.load(open(f'{S}/presentacions.json'))
    informe = {'fetes': [], 'sense_diapositives': [], 'sense_acords': [], 'no_quadren': [], 'imatges': []}
    for o in pres:
        f = f"{S}/bolcats/{o['id']}.json"
        s = json.load(open(f))
        if not s:
            informe['sense_diapositives'].append(o['titol']); continue
        c.avisos.clear()
        cho = c.converteix(s, o['titol'])
        if any('no quadren' in a for a in c.avisos):
            informe['no_quadren'].append(o['titol']); continue
        if any('imatge' in a for a in c.avisos):
            informe['imatges'].append(o['titol'])
        e = etiquetes(o['tags'])
        if e:
            cho = cho.replace('\n\n', '\n{meta: etiquetes ' + ', '.join(e) + '}\n\n', 1)
        if '[' not in cho:
            informe['sense_acords'].append(o['titol'])
        sl = slug(o['titol'])
        open(f'{REPO}/cancons/{sl}.cho', 'w').write(cho)
        informe['fetes'].append(sl)
    json.dump(informe, open(f'{S}/informe-lot.json', 'w'), ensure_ascii=False, indent=1)
    print({k: len(v) for k, v in informe.items()})
    for k in ('sense_diapositives', 'no_quadren', 'imatges', 'sense_acords'): print(k, informe[k])


if __name__ == '__main__':
    main()
