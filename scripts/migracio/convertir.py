#!/usr/bin/env python3
"""Converteix el bolcat d'una presentació (volcar.js) en ChordPro.

Ús: convertir.py bolcat.json "Títol" > canco.cho   (els avisos van a stderr)
Posa cada acord sobre la síl·laba que té a sota a la diapositiva, mesurant la
posició real dels traços de les lletres.
"""
import json, re, sys, statistics, unicodedata
from PIL import ImageFont

F_REG = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 100)
F_BOLD = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 100)
avisos = []
DESV = []

def avis(m):
    avisos.append(m)

# ---------- traços ----------
NUM = re.compile(r'-?\d*\.?\d+(?:[eE][-+]?\d+)?')

def contorns(d):
    """Caixes (x0,y0,x1,y1) de cada subtraç d'un path amb ordres m l q c h v z."""
    toks = re.findall(r'[MmLlQqCcHhVvZzSsTt]|-?\d*\.?\d+(?:[eE][-+]?\d+)?', d)
    i = 0; cx = cy = 0; sx = sy = 0; cmd = None; out = []; pts = []
    def tanca():
        if pts:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            out.append((min(xs), min(ys), max(xs), max(ys), len(pts)))
    nargs = {'m': 2, 'l': 2, 'q': 4, 'c': 6, 'h': 1, 'v': 1, 's': 4, 't': 2, 'z': 0}
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'zZ':
                cx, cy = sx, sy
                continue
            if cmd in 'mM':
                tanca(); pts = []
        n = nargs[cmd.lower()]
        a = [float(x) for x in toks[i:i + n]]; i += n
        rel = cmd.islower(); c = cmd.lower()
        bx, by = (cx, cy) if rel else (0, 0)
        if c == 'h':
            cx = a[0] + (cx if rel else 0); pts.append((cx, cy)); continue
        if c == 'v':
            cy = a[0] + (cy if rel else 0); pts.append((cx, cy)); continue
        ps = [(bx + a[k], by + a[k + 1]) for k in range(0, n, 2)]
        pts.extend(ps)
        cx, cy = ps[-1]
        if c == 'm':
            sx, sy = cx, cy
            cmd = 'l' if rel else 'L'
    tanca()
    return out

def es_tinta(fill):
    """Color de lletra: descarta els fons blancs o gairebé blancs (ressaltats)."""
    if not fill or not re.fullmatch(r'#[0-9a-fA-F]{6}', fill):
        return False
    r, g, b = (int(fill[i:i + 2], 16) for i in (1, 3, 5))
    return 0.299 * r + 0.587 * g + 0.114 * b < 200

# ---------- acords ----------
ARREL = r'(?:do|re|mi|fa|sol|la|si|[a-g])'
ACORD = re.compile(r'^\(?' + ARREL + r'(?:[#b♯♭])?(?:m|min|maj|dim|aug|sus|add|[0-9+º°ø-])*(?:/' + ARREL + r'[#b]?)?\)?$', re.I)
PUNT = re.compile(r'^[\.\-–—…·|/\\:,;()x0-9*>→]+$')

def es_fitxa_acord(t):
    return es_acord(t) if t.startswith('(') else es_acord(t.replace(' ', ''))

def es_acord(t):
    if len(t) > 1 and t[-1] in '.,;:' and not t.endswith('..'):
        t = t[:-1]  # «SOL.» al final d'un grup
    if re.fullmatch(r'[^-\s]+(?:-[^-\s]+)+', t):  # «la-FA», «DO-SOL7»: dos acords seguits
        return all(es_acord(x) for x in t.split('-'))
    if t.startswith('(') and t.endswith(')') and ' ' in t:
        return all(es_acord(x) for x in t[1:-1].split())
    if not ACORD.match(t):
        return False
    # «a» o «e» sola en minúscula és lletra, no acord
    return t not in ('a', 'e', 'b', 'c', 'd', 'f', 'g')

def fitxes_acords(linia):
    toks = [t[:-1] if len(t) > 1 and t[-1] in '.,;:' and not t.endswith('..') else t
            for t in linia.replace('\t', ' ').split()]  # «LA.» és LA
    out = []
    for t in toks:
        if out and re.fullmatch(r'm(?:7|aj7|in)?', t) and es_acord(out[-1]) and not out[-1].lower().endswith('m'):
            out[-1] = out[-1] + ' ' + t
            continue
        if out and re.fullmatch(r'(?:7|9|6|maj7|sus4|dim|\+)', t) and es_acord(out[-1].replace(' ', '')) and not re.search(r'[0-9]$', out[-1]):
            out[-1] = out[-1] + t  # «RE 7» és RE7
            continue
        out.append(t)
    # «(fa# MI)» és una sola etiqueta: els acords entre parèntesis van junts
    junts = []; obert = False
    for t in out:
        if obert:
            junts[-1] += ' ' + t
            obert = ')' not in t
        else:
            junts.append(t)
            obert = t.startswith('(') and ')' not in t
    return [t[:-1] if len(t) > 1 and t[-1] in '.,;:' and es_acord(t) and not es_acord(t + 'x') else t for t in junts]

def es_linia_acords(linia):
    f = fitxes_acords(linia)
    if not f:
        return False
    ac = [t for t in f if es_fitxa_acord(t)]
    return len(ac) >= 1 and all(es_fitxa_acord(t) or PUNT.match(t) for t in f)

def es_separador(linia):
    s = linia.strip()
    return len(s) >= 3 and re.fullmatch(r'[\.…_\-–—·*=~ ]+', s) is not None

# ---------- síl·labes ----------
VOC = 'aeiouàèéíòóúïüAEIOUÀÈÉÍÒÓÚÏÜ'
GRUP = {'pl', 'bl', 'cl', 'gl', 'fl', 'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'ny', 'll', 'ch', 'qu', 'gu', 'rr', 'ss'}
GRUP_JUNTS = {'pl', 'bl', 'cl', 'gl', 'fl', 'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'ny', 'll', 'ch'}

def es_lletra(c):
    return unicodedata.category(c).startswith('L')

def inicis_sillaba(text):
    """Posicions on comença una síl·laba (aproximació per al català i el castellà)."""
    ini = set()
    i = 0; n = len(text)
    while i < n:
        if not es_lletra(text[i]):
            i += 1; continue
        j = i
        while j < n and (es_lletra(text[j]) or text[j] in "·'’"):
            j += 1
        paraula = text[i:j]
        ini.add(i)
        low = paraula.lower()
        # vocals (u de qu/gu davant e/i no compta)
        esv = []
        for k, c in enumerate(low):
            v = c in VOC.lower()
            if c in 'uü' and k > 0 and low[k - 1] in 'qg' and c == 'u' and k + 1 < len(low) and low[k + 1] in 'eiéèí':
                v = False
            if c == 'i' and k > 0 and low[k - 1] in VOC.lower() and (k + 1 == len(low) or low[k + 1] not in VOC.lower()):
                v = False  # diftong decreixent: rei, mai
            if c == 'u' and k > 0 and low[k - 1] in VOC.lower() and (k + 1 == len(low) or low[k + 1] not in VOC.lower()):
                v = False  # diftong: cau, veu
            if c in 'iu' and 0 < k < len(low) - 1 and low[k - 1] in VOC.lower() and low[k + 1] in VOC.lower():
                v = False  # entre vocals és consonant: jo-io-sa, ve-ure
            esv.append(v)
        nuclis = [k for k in range(len(low)) if esv[k] and (k == 0 or not esv[k - 1])]
        for a, b in zip(nuclis, nuclis[1:]):
            # consonants entre el final del nucli a i el nucli b
            fi = a
            while fi + 1 < len(low) and esv[fi + 1]:
                fi += 1
            cons = low[fi + 1:b]
            cons_net = cons.replace('·', '').replace("'", '').replace('’', '')
            if len(cons) == 0:
                continue
            if len(cons_net) <= 1:
                tall = b - len(cons)
                if cons.startswith('·') or cons.startswith("'") or cons.startswith('’'):
                    tall = b - len(cons) + 1
            elif cons[-2:] in GRUP_JUNTS or (cons[-2:] in ('qu', 'gu')):
                tall = b - 2
            elif '·' in cons:
                tall = fi + 1 + cons.index('·') + 1
            else:
                tall = b - 1
            ini.add(i + tall)
        i = j
    return sorted(ini)

# ---------- mesura ----------
def amplada(text, negreta=False):
    f = F_BOLD if negreta else F_REG
    return f.getlength(text.replace('\t', ' '))

# ---------- files ----------
def files(paths):
    """Agrupa els contorns en files de text (per solapament vertical dels traços)."""
    tots = [c for p in paths for c in contorns(p['d'])]
    alt_med = statistics.median([c[3] - c[1] for c in tots]) if tots else 10
    caixes = []
    for p in paths:
        cs = [c for c in contorns(p['d'])
              if not (c[2] - c[0] > 10 and c[2] - c[0] > 6 * max(c[3] - c[1], 0.01))  # subratllats
              and not (c[4] <= 6 and c[3] - c[1] > 1.5 * alt_med and c[2] - c[0] > c[3] - c[1])]  # fons ressaltat
        if not cs:
            continue
        x0 = min(c[0] for c in cs); x1 = max(c[2] for c in cs)
        y0 = min(c[1] for c in cs); y1 = max(c[3] for c in cs)
        if y1 - y0 > 60:
            continue  # vora de la caixa o dibuix, no text
        caixes.append({'cs': cs, 'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1})
    caixes.sort(key=lambda c: (c['y1'], c['x0']))
    fs = []
    for c in caixes:
        mig = (c['y0'] + c['y1']) / 2
        for f in fs:
            if f['y0'] - 2 <= mig <= f['y1'] + 2 or (c['y1'] - f['y1']) ** 2 < 4:
                f['cs'] += c['cs']; f['y0'] = min(f['y0'], c['y0']); f['y1'] = max(f['y1'], c['y1'])
                break
        else:
            fs.append({'cs': list(c['cs']), 'y0': c['y0'], 'y1': c['y1']})
    for f in fs:
        f['cs'].sort()
        f['x0'] = min(c[0] for c in f['cs']); f['x1'] = max(c[2] for c in f['cs'])
        f['alt'] = f['y1'] - f['y0']
    fs.sort(key=lambda f: f['y0'])
    return fs

def grups_x(cs, n):
    """Parteix els contorns d'una fila en n grups pels n-1 forats més grans."""
    cs = sorted(cs)
    forats = []
    dreta = cs[0][2]
    for k in range(1, len(cs)):
        forats.append((cs[k][0] - dreta, k))
        dreta = max(dreta, cs[k][2])
    talls = sorted(k for _, k in sorted(forats, reverse=True)[:n - 1])
    grups = []; ant = 0
    for t in talls + [len(cs)]:
        g = cs[ant:t]; ant = t
        grups.append((min(c[0] for c in g), max(c[2] for c in g)))
    return grups

# ---------- aparellar files i línies ----------
def n_grups(fila, llindar):
    cs = sorted(fila['cs']); n = 1; dreta = cs[0][2]
    for c in cs[1:]:
        if c[0] - dreta > llindar:
            n += 1
        dreta = max(dreta, c[2])
    return n

def aparella(linies, fs, k, ample_caixa):
    """Assigna files a línies (programació dinàmica) amb l'escala k. Una línia de
    lletra pot ocupar fins a tres files si es parteix. Torna (llista, cost mitjà)."""
    import functools
    L = len(linies); F = len(fs)
    alt_lletra = statistics.median([f['alt'] for f in fs]) if fs else 10

    def cost_linia(j, i, m):
        lin = linies[j]; grup = fs[i:i + m]
        if lin['tipus'] == 'separador':
            return 0 if grup[0]['alt'] < 4 else 1
        if lin['tipus'] == 'acords':
            if grup[0]['alt'] < 4:
                return 1
            toks = len(fitxes_acords(lin['text']))
            g = n_grups(grup[0], 2.5 * k * 28)  # forat de més d'un parell d'espais
            return 0 if g >= toks else 0.3 * (toks - g)
        t = lin['text'].strip()
        pred = [amplada(t) * k, amplada(t, True) * k]
        real = sum(f['x1'] - f['x0'] for f in grup)
        e = min(abs(real - p) / max(p, 1) for p in pred)
        if grup[0]['alt'] < 4:
            e += 1
        if m > 1:
            e += 0.03 * (m - 1)
            if min(pred) < ample_caixa * 0.8:
                e += 1  # una línia curta no es parteix
        return e

    @functools.lru_cache(None)
    def dp(j, i):
        if j == L:
            return (0, ()) if i == F else (1e9, ())
        millor = (1e9, ())
        maxm = 1 if linies[j]['tipus'] != 'lletra' else 3
        for m in range(1, maxm + 1):
            if i + m > F:
                break
            c = cost_linia(j, i, m)
            r = dp(j + 1, i + m)
            if c + r[0] < millor[0]:
                millor = (c + r[0], ((i, m),) + r[1])
        return millor

    tot, cami = dp(0, 0)
    if tot >= 1e9:
        return None, 1e9
    return [fs[i:i + m] for i, m in cami], tot / max(L, 1)

# ---------- conversió ----------
def posicions_lletres(text, fila, negreta):
    """x de l'esquerra de cada caràcter de text dins la fila (escalat a la fila real)."""
    t = text.rstrip()
    lead = len(t) - len(t.lstrip())
    cos = t.lstrip()
    tot = amplada(cos, negreta) or 1
    esc = (fila['x1'] - fila['x0']) / tot
    xs = [None] * len(t)
    for c in range(len(cos)):
        xs[lead + c] = fila['x0'] + amplada(cos[:c], negreta) * esc
    for c in range(lead):
        xs[c] = fila['x0']
    return xs, esc

def text_primera_fila(text, fila, altres):
    """Part del text que cap a la primera fila quan la línia es parteix: el tall de
    paraula que reparteix l'amplada en la mateixa proporció que les files reals."""
    w1 = fila['x1'] - fila['x0']
    wt = w1 + sum(f['x1'] - f['x0'] for f in altres)
    if wt <= 0:
        return text.strip()
    tot = amplada(text.strip()) or 1
    millor = (1e9, text)
    for m in re.finditer(r'\s+', text.strip()):
        part = text.strip()[:m.start()]
        d = abs(amplada(part) / tot - w1 / wt)
        if d < millor[0]:
            millor = (d, part)
    return millor[1]

def col_loca(acords, lletra, xs):
    """Posa cada acord (text, x0) a l'inici de síl·laba més proper. Torna text ChordPro."""
    inicis = inicis_sillaba(lletra)
    ins = {}
    fi_x = xs[-1] if xs else 0
    amp_c = (xs[-1] - xs[0]) / max(len(lletra.strip()) - 1, 1) if xs else 1
    for nom, x in acords:
        if not lletra.strip():
            continue
        if x > fi_x + 1.5 * amp_c and xs:
            pos = len(lletra.rstrip())
        else:
            cand = inicis or [0]
            pos = min(cand, key=lambda p: abs(xs[p] - x) if p < len(xs) else 1e9)
            DESV.append(((xs[pos] - x) / max(amp_c, 0.1), nom, lletra))
        ins.setdefault(pos, []).append(nom)
    out = ''
    for p in range(len(lletra) + 1):
        if ins.get(p):
            out += '[' + ' '.join(ins[p]) + ']'  # dos acords a la mateixa síl·laba van junts
        if p < len(lletra):
            out += lletra[p]
    return out

def converteix(slides, titol):
    blocs = []  # llista de llistes de línies ChordPro (estrofes)
    for ns, sl in enumerate(slides):
        caixes = []; act = None
        for it in sl['items']:
            if it['t'] == 'text':
                act = {'label': it['label'], 'paths': []}; caixes.append(act)
            elif it['t'] == 'path' and act is not None and es_tinta(it.get('fill')):
                act['paths'].append(it)
            elif it['t'] == 'image':
                avis(f'diapositiva {ns + 1}: hi ha una imatge')
        for cx in caixes:
            text = unicodedata.normalize('NFKC', cx['label']).replace('\u000b', '\n').replace('\r', '')  # 𝐒𝐎𝐋 → SOL
            crues = text.split('\n')
            linies = []
            for r in crues:
                if not r.strip():
                    linies.append({'tipus': 'buida', 'text': ''})
                elif es_separador(r):
                    linies.append({'tipus': 'separador', 'text': r})
                elif es_linia_acords(r):
                    linies.append({'tipus': 'acords', 'text': r})
                else:
                    linies.append({'tipus': 'lletra', 'text': r})
            visibles = [L for L in linies if L['tipus'] != 'buida']
            if not visibles:
                continue
            fs = [f for f in files(cx['paths'])]
            if not fs:
                avis(f'diapositiva {ns + 1}: caixa sense traços'); continue
            ample = max(f['x1'] for f in fs) - min(f['x0'] for f in fs)
            millor = (None, 1e9, 0)
            for k100 in range(50, 400, 2):
                k = k100 / 1000
                res, e = aparella(visibles, fs, k, ample)
                if res is not None and e < millor[1]:
                    millor = (res, e, k)
            res, e, k = millor
            if res is None:
                avis(f'diapositiva {ns + 1}: no quadren {len(fs)} files amb {len(visibles)} línies; acords sense col·locar')
                res = None
            # construeix
            estrofa = []
            pendents = None  # (acords amb x) esperant la línia de lletra
            vi = 0
            for L in linies:
                if L['tipus'] == 'buida':
                    if pendents:
                        estrofa.append(' '.join('[' + a + ']' for a, _ in pendents)); pendents = None
                    if estrofa:
                        blocs.append(estrofa); estrofa = []
                    continue
                fl = res[vi] if res else None; vi += 1
                if L['tipus'] == 'separador':
                    if pendents:
                        estrofa.append(' '.join('[' + a + ']' for a, _ in pendents)); pendents = None
                    if estrofa:
                        blocs.append(estrofa); estrofa = []
                    continue
                if L['tipus'] == 'acords':
                    if pendents:
                        estrofa.append(' '.join('[' + a + ']' for a, _ in pendents))
                    toks = fitxes_acords(L['text'])
                    if fl:
                        gx = grups_x(fl[0]['cs'], len(toks)) if len(fl[0]['cs']) >= len(toks) else [(fl[0]['x0'], fl[0]['x1'])] * len(toks)
                        pendents = [(t, g[0]) for t, g in zip(toks, gx) if es_fitxa_acord(t)]
                    else:
                        pendents = [(t, 0) for t in toks if es_fitxa_acord(t)]
                    continue
                # lletra
                lt = L['text'].strip()
                if pendents and fl:
                    negreta = lt.isupper() and False
                    f0 = fl[0]
                    if len(fl) > 1:
                        part = text_primera_fila(lt, f0, fl[1:])
                        resta = lt[len(part):].strip()
                    else:
                        part, resta = lt, ''
                    xs, _ = posicions_lletres(part, f0, negreta)
                    linia = col_loca(pendents, part.rstrip(), xs)
                    if resta:
                        linia = linia + ' ' + resta
                    estrofa.append(linia)
                elif pendents:
                    estrofa.append(' '.join('[' + a + ']' for a, _ in pendents) + ' ' + lt)
                else:
                    estrofa.append(lt)
                pendents = None
            if pendents:
                estrofa.append(' '.join('[' + a + ']' for a, _ in pendents))
            if estrofa:
                blocs.append(estrofa)
    return escriu(blocs, titol)


def escriu(blocs, titol):
    """Estrofes (llistes de línies ChordPro) → text ChordPro, amb tornades i rètols."""
    out = ['{title: ' + titol + '}', '']
    def es_maj(l):
        t = re.sub(r'\[[^\]]*\]', '', l).strip()
        return bool(t) and t == t.upper() and re.search(r'[A-ZÀ-Ú]{3}', t) is not None
    partits = []
    for b in blocs:
        b = [re.sub(r'(?<=\S)  +', ' ', l).rstrip() for l in b]
        tros = [[b[0]]]
        for l in b[1:]:
            if es_maj(l) != es_maj(tros[-1][-1]) and re.sub(r'\[[^\]]*\]', '', l).strip():
                tros.append([l])
            else:
                tros[-1].append(l)
        partits += tros
    blocs = partits
    for b in blocs:
        lletres = [re.sub(r'\[[^\]]*\]', '', l) for l in b]
        net = [re.sub(r'\[[^\]]*\]', '', l).strip() for l in b]
        if len(b) == 1 and '[' not in b[0] and es_maj(b[0]) and len(net[0]) <= 40:
            out.append('{comment: ' + net[0].capitalize() + '}')
            out.append('')
            continue
        tornada = all(l.strip() == l.strip().upper() and re.search(r'[A-ZÀ-Ú]{3}', l) for l in lletres if l.strip())
        if tornada:
            out.append('{start_of_chorus}')
        out += b
        if tornada:
            out.append('{end_of_chorus}')
        out.append('')
    return '\n'.join(out).rstrip() + '\n'

if __name__ == '__main__':
    slides = json.load(open(sys.argv[1]))
    print(converteix(slides, sys.argv[2]), end='')
    for a in avisos:
        print('AVÍS:', a, file=sys.stderr)
