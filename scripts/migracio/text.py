#!/usr/bin/env python3
"""Converteix les cançons de text del cançoner antic (acords a la línia de sobre,
en lletra d'amplada fixa) en ChordPro, amb la mateixa regla de síl·labes que
les presentacions.

Ús: text.py text.json SORTIDA   (text.json: [{titol, tags, text}] ja net del
marcatge del TiddlyWiki). Escriu SORTIDA/slug.cho.
"""
import json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
import convertir as c
from lot import slug, etiquetes


def prepara_acords(l):
    """Treu els punts de guia i junta «LA - 7» com a LA7, sense moure columnes."""
    l = l.replace('\t', ' ' * 4)
    l2 = re.sub(r'[.…·,]+', lambda m: ' ' * len(m.group()), l)
    l2 = re.sub(r'([A-Za-z#]+) *- *7\b', lambda m: (m.group(1) + '7').ljust(len(m.group())), l2)
    l2 = re.sub(r'\b(do|re|mi|fa|sol|la|si)-(?=\s|$|\))', r'\1m', l2)  # «si-» en minúscula és si menor
    return l2


def fitxes_amb_columna(l):
    fitxes = []
    for m in re.finditer(r'\S+', l):
        fitxes.append([m.group(), m.start()])
    junts = []
    for t, col in fitxes:
        if junts and re.fullmatch(r'm(?:7|aj7|in)?', t) and c.es_acord(junts[-1][0]) and not junts[-1][0].lower().endswith('m'):
            junts[-1][0] += ' ' + t; continue
        if junts and re.fullmatch(r'(?:7|9|6|maj7|sus4|dim|\+)', t) and c.es_acord(junts[-1][0].replace(' ', '')):
            junts[-1][0] += t; continue
        if junts and (t.startswith('-') or junts[-1][0].endswith('-')):
            junts[-1][0] += t; continue
        if junts and junts[-1][0].startswith('(') and ')' not in junts[-1][0]:
            junts[-1][0] += ' ' + t; continue
        junts.append([t, col])
    return [(t, col) for t, col in junts if c.es_fitxa_acord(t)]


def es_linia_acords(l):
    """Línia només d'acords (amb guions, parèntesis i puntuació permesos)."""
    if not fitxes_amb_columna(l):
        return False
    for t in l.split():
        net = t.strip('-()')
        if not net or c.PUNT.match(t) or c.es_fitxa_acord(t) or c.es_acord(net):
            continue
        if re.fullmatch(r'm(?:7|aj7|in)?|7|9|6|maj7|sus4|dim|\+', net):
            continue
        return False
    return True


from PIL import ImageFont
LLETRES = {
    'serif': ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', 100),
    'sans': ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 100),
}


def posicions(linia, lletra):
    """x de cada caràcter de la línia escrita amb una lletra proporcional (o columnes)."""
    if lletra == 'mono':
        return list(range(len(linia) + 1))
    f = LLETRES[lletra]
    return [f.getlength(linia[:i]) for i in range(len(linia) + 1)]


def converteix_text(text, titol, lletra=None):
    """Prova les lletres i es queda la que deixa menys acords fora de la línia."""
    if lletra:
        return converteix_amb(text, titol, lletra)[0]
    millor = min((converteix_amb(text, titol, ll)[1], i, ll) for i, ll in enumerate(('serif', 'sans', 'mono')))
    return converteix_amb(text, titol, millor[2])[0]


def converteix_amb(text, titol, lletra):
    fora = 0
    linies = [l.rstrip() for l in text.replace('\r', '').split('\n')]
    blocs, estrofa = [], []
    i = 0
    while i < len(linies):
        l = linies[i]
        if not l.strip():
            if estrofa: blocs.append(estrofa); estrofa = []
            i += 1; continue
        pa = prepara_acords(l)
        if es_linia_acords(pa):
            acords = fitxes_amb_columna(pa)
            seg = linies[i + 1] if i + 1 < len(linies) else ''
            if seg.strip() and not es_linia_acords(prepara_acords(seg)):
                lyr = seg.replace('\t', ' ' * 4)
                xa = posicions(pa, lletra)
                xs = posicions(lyr, lletra)[:len(lyr)]
                ac = [(a, xa[col]) for a, col in acords]
                amp = (xs[-1] - xs[0]) / max(len(lyr) - 1, 1) if len(xs) > 1 else 1
                fora += sum(max(0, x - xs[-1]) / amp for _, x in ac) if xs else 0
                estrofa.append(c.col_loca(ac, lyr, xs).strip())
                i += 2; continue
            estrofa.append(' '.join('[' + a + ']' for a, _ in acords))
            i += 1; continue
        estrofa.append(l.strip())
        i += 1
    if estrofa: blocs.append(estrofa)
    return c.escriu(blocs, titol), fora


if __name__ == '__main__':
    cancons = json.load(open(sys.argv[1]))
    for o in cancons:
        cho = converteix_text(o['text'], o['titol'])
        e = etiquetes(o['tags'])
        if e:
            cho = cho.replace('\n\n', '\n{meta: etiquetes ' + ', '.join(e) + '}\n\n', 1)
        open(os.path.join(sys.argv[2], slug(o['titol']) + '.cho'), 'w').write(cho)
        print(slug(o['titol']))
