#!/usr/bin/env python3
"""Cançó en imatge (acords a la línia de sobre) → ChordPro, amb OCR (tesseract).

Ús: imatge.py IMATGE "Títol" [IMATGE2 ...]   → ChordPro per la sortida estàndard.
La posició de cada paraula ve de l'OCR; la de cada lletra dins la paraula,
repartint l'amplada de la paraula segons Liberation Sans. Després cal revisar
el text, perquè l'OCR s'equivoca en alguna lletra.
"""
import csv, io, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
import convertir as c
from PIL import Image


def paraules(imatge):
    im = Image.open(imatge).convert('L')
    esc = max(1, round(1800 / im.width))
    im = im.resize((im.width * esc, im.height * esc), Image.LANCZOS)
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        im.save(f.name)
        tsv = subprocess.run(['tesseract', f.name, '-', '-l', 'cat+spa', '--psm', '6', 'tsv'],
                             capture_output=True, text=True).stdout
    files = {}
    for r in csv.DictReader(io.StringIO(tsv), delimiter='\t', quoting=csv.QUOTE_NONE):
        if r['level'] != '5' or not r['text'].strip():
            continue
        k = (int(r['block_num']), int(r['par_num']), int(r['line_num']))
        files.setdefault(k, []).append((r['text'], int(r['left']), int(r['left']) + int(r['width']), int(r['top'])))
    return [sorted(v, key=lambda w: w[1]) for k, v in sorted(files.items(), key=lambda kv: min(w[3] for w in kv[1]))]


def posicions(fila):
    """Text de la fila i x de cada caràcter."""
    text, xs = '', []
    for i, (w, x0, x1, _) in enumerate(fila):
        if i:
            text += ' '; xs.append(xs[-1] if xs else x0)
        tot = c.amplada(w) or 1
        for k in range(len(w)):
            xs.append(x0 + (x1 - x0) * c.amplada(w[:k]) / tot)
        text += w
    return text, xs


def converteix(imatges, titol):
    blocs, estrofa = [], []
    for im in imatges:
        fs = paraules(im)
        i = 0
        while i < len(fs):
            text, xs = posicions(fs[i])
            if c.es_linia_acords(text):
                acords = [(w, x0) for w, x0, _, _ in fs[i] if c.es_acord(w)]
                if i + 1 < len(fs):
                    t2, x2 = posicions(fs[i + 1])
                    if not c.es_linia_acords(t2):
                        estrofa.append(c.col_loca(acords, t2, x2)); i += 2; continue
                estrofa.append(' '.join('[' + a + ']' for a, _ in acords)); i += 1; continue
            estrofa.append(text); i += 1
        blocs.append(estrofa); estrofa = []
    return c.escriu(blocs, titol)


if __name__ == '__main__':
    print(converteix(sys.argv[1:2] + sys.argv[3:], sys.argv[2]), end='')
