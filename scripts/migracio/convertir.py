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
NEGRETA = '\x01'  # marca interna d'una línia en negreta

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
            # Àrea amb signe (shoelace): els forats van en sentit contrari i resten.
            n = len(pts)
            area = sum(pts[k][0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * pts[k][1] for k in range(n)) / 2
            perim = sum(((pts[(k + 1) % n][0] - pts[k][0]) ** 2 + (pts[(k + 1) % n][1] - pts[k][1]) ** 2) ** .5 for k in range(n))
            out.append((min(xs), min(ys), max(xs), max(ys), n, area, perim))
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
    l = linia.replace('\t', ' ').replace('→', ' ').replace('->', ' ').replace('*', ' ')
    l = re.sub(r'\b([A-Ga-g]|DO|RE|MI|FA|SOL|LA|SI|do|re|mi|fa|sol|la|si) #', r'\1#', l)  # «FA #»
    l = re.sub(r'(\S)\(', r'\1 (', l)  # «LA7(RE)» són dos
    toks = [t[:-1] if len(t) > 1 and t[-1] in '.,;:' and not t.endswith('..') else t
            for t in l.split()]  # «LA.» és LA
    toks = [t[1:] if len(t) > 1 and t[0] == '-' and es_acord(t[1:]) else t for t in toks]  # «-LA7»
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
    return len(ac) >= 1 and all(es_fitxa_acord(t) or PUNT.match(t) or re.fullmatch(r'\(?(?:bis|x\d+|\d+x)\)?', t, re.I) for t in f)

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

def gruix(cs):
    """Mitjana del forat interior respecte a la lletra (amplada), en els
    contorns que en contenen un altre: més petit com més gruixut és el traç."""
    rs = []
    for a in cs:
        wa = a[2] - a[0]
        if wa <= 0 or a[3] - a[1] <= 0:
            continue
        for b in cs:
            if b is not a and b[0] > a[0] and b[2] < a[2] and b[1] > a[1] and b[3] < a[3]:
                rs.append((b[2] - b[0]) / wa)
    return statistics.median(rs) if len(rs) >= 3 else None


# ---------- lletres en negreta dins la línia ----------
# A les presentacions, sovint es posa en negreta la síl·laba forta del ritme
# («Enmig del **món** quin **goig**»). Es dedueix del gruix del traç de cada
# lletra: àrea / mig perímetre dels seus contorns, que en una lletra de pal sec
# és gairebé igual a totes les lletres i creix amb la negreta. Es compara amb
# la mitjana de la fila, de manera que una línia sencera en negreta (la
# tornada, que ja es marca a part) no hi surt.
LLINDAR_NEGRETA = 1.22
NOTES_PARAULA = {'do', 're', 'mi', 'fa', 'sol', 'la', 'si'}


def xs_lletres(text, fila, mask):
    """(x esquerra, x dreta) de cada caràcter de text dins la fila: amplades de
    Liberation Sans (negreta on diu mask) i cada paraula ajustada al seu grup
    de traços, perquè la desviació no s'acumuli al llarg de la línia."""
    w = [(F_BOLD if m else F_REG).getlength(ch) for ch, m in zip(text, mask)]
    esc = (fila['x1'] - fila['x0']) / (sum(w) or 1)
    xs = []; x = fila['x0']
    for wi in w:
        xs.append((x, x + wi * esc)); x += wi * esc
    paraules = [(m.start(), m.end()) for m in re.finditer(r'\S+', text)]
    cs = sorted(fila['cs'])
    n = len(paraules)
    if n < 2 or len(cs) < n:
        return xs
    forats = []; dreta = cs[0][2]
    for k in range(1, len(cs)):
        forats.append((cs[k][0] - dreta, k)); dreta = max(dreta, cs[k][2])
    ordenats = sorted(forats, reverse=True)
    # Els n-1 forats més grans han de ser els espais: clarament més grans que
    # el següent, o almenys de mig espai.
    if ordenats[n - 2][0] < 1.5 * max(ordenats[n - 1][0], 0.01) and ordenats[n - 2][0] < 0.5 * esc * F_REG.getlength(' '):
        return xs
    talls = sorted(k for _, k in ordenats[:n - 1])
    out = list(xs); ant = 0
    for (a, b), t in zip(paraules, talls + [len(cs)]):
        g = cs[ant:t]; ant = t
        gx0 = min(k[0] for k in g); gx1 = max(k[2] for k in g)
        w0, w1 = xs[a][0], xs[b - 1][1]
        e = (gx1 - gx0) / max(w1 - w0, 0.01)
        for i in range(a, b):
            out[i] = (gx0 + (xs[i][0] - w0) * e, gx0 + (xs[i][1] - w0) * e)
    return out


def gruix_lletres(text, fila, mask):
    """Gruix del traç de cada lletra respecte a la mitjana de la fila (None
    si no és una lletra o no té traços)."""
    if not text.strip():
        return [None] * len(text)
    xs = xs_lletres(text, fila, mask)
    A = [0.0] * len(text); P = [0.0] * len(text)
    for k in fila['cs']:
        mx = (k[0] + k[2]) / 2
        i = min(range(len(text)), key=lambda i: 0 if xs[i][0] <= mx < xs[i][1] else min(abs(mx - xs[i][0]), abs(mx - xs[i][1])))
        A[i] += k[5]; P[i] += k[6]
    g = [abs(a) / (p / 2) if p > 0 and ch.isalpha() else None for ch, a, p in zip(text, A, P)]
    vals = [x for x in g if x]
    if not vals:
        return [None] * len(text)
    m = statistics.median(vals)
    return [x / m if x else None for x in g]


def decideix_negreta(text, q):
    """Quines lletres van en negreta, a partir del gruix relatiu q."""
    n = len(text)
    # Una línia d'acords que s'ha llegit com a lletra («MI SI7MI7 LA») no en té.
    paraules = text.split()
    if paraules and sum(es_fitxa_acord(p) for p in paraules) * 2 >= len(paraules):
        return [False] * n
    b = [bool(x and x > LLINDAR_NEGRETA) for x in q]
    for i in range(n):
        if b[i] or not text[i].isalpha():
            continue
        veins = [j for j in (i - 1, i + 1) if 0 <= j < n and text[j].isalpha()]
        # Traços que s'ha quedat la lletra del costat: una molt baixa i l'altra molt alta.
        if q[i] is not None and q[i] < 0.6 and any(q[j] and q[j] > 1.9 for j in veins):
            b[i] = True
        # Lletra sense mesura, o una mica per sota, al costat d'una negreta.
        elif (q[i] is None or q[i] > 1.12) and any(b[j] for j in veins):
            b[i] = True
        # Lligadures «fi» i «fl»: el traç de la «f» va amb la lletra següent.
        elif text[i] == 'f' and i + 1 < n and text[i + 1] in 'il' and b[i + 1]:
            b[i] = True
    majuscules = text == text.upper()
    for m in re.finditer(r"[\w·'’]+", text):
        w = range(m.start(), m.end())
        p = m.group()
        seguent = text[m.end():m.end() + 1]
        # Els acords escrits dins la lletra («RE SOL RE7», «mim», «SOLRE+7») no
        # es marquen; «la», «si» o «sol» com a paraula, sí.
        acord = es_acord(p) or (seguent and seguent in '+/#' and p.isupper())
        if acord and (p.lower() not in NOTES_PARAULA or (p.isupper() and not majuscules)):
            for i in w:
                b[i] = False
            continue
        # Una lletra sola dins d'una paraula més llarga és soroll.
        if len(w) > 1:
            for i in w:
                if b[i] and not any(b[j] for j in (i - 1, i + 1) if j in w):
                    b[i] = False
    # El punt volat i l'apòstrof dins d'una paraula segueixen les lletres del costat.
    for i in range(1, n - 1):
        if text[i] in "·'’-" and b[i - 1] and b[i + 1]:
            b[i] = True
    return b


def negreta_linia(text, fl):
    """Màscara de negreta dels caràcters de text (línia de lletra que ocupa les
    files fl). Si la línia es parteix en més d'una fila, cada tros a la seva."""
    trossos = []; resta = text
    for i, f in enumerate(fl):
        if i == len(fl) - 1:
            trossos.append((resta, f)); break
        part = text_primera_fila(resta, f, fl[i + 1:])
        trossos.append((part, f)); resta = resta[len(part):].strip()
    marques = []
    for tx, f in trossos:
        mask = [False] * len(tx)
        for _ in range(2):  # la segona volta mesura amb l'amplada de la negreta
            mask = decideix_negreta(tx, gruix_lletres(tx, f, mask))
        marques += [m for ch, m in zip(tx, mask) if not ch.isspace()]
    return marques  # una per caràcter no blanc, en ordre


def posa_negreta(linia, marques):
    """Afegeix <b>…</b> a una línia ChordPro segons les marques (una per
    caràcter no blanc de la lletra, sense comptar els acords)."""
    out = ''; k = 0; dins = False; i = 0
    while i < len(linia):
        ch = linia[i]
        if ch == '[':
            fi = linia.find(']', i)
            if fi > -1:
                # La negreta es tanca abans de l'acord si la lletra següent no hi va.
                if dins and not (k < len(marques) and marques[k]):
                    out += '</b>'; dins = False
                out += linia[i:fi + 1]; i = fi + 1; continue
        if not ch.isspace():
            m = k < len(marques) and marques[k]; k += 1
            if m and not dins:
                out += '<b>'; dins = True
            elif not m and dins:
                out += '</b>'; dins = False
        elif dins:
            # Un espai tanca la negreta si la lletra següent ja no hi va.
            if not (k < len(marques) and marques[k]):
                out += '</b>'; dins = False
        out += ch; i += 1
    if dins:
        out += '</b>'
    return out


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
            # Negreta: Google no la deixa al text ni als estils publicats. Es
            # dedueix del gruix del traç: en negreta, el forat de lletres com
            # la «o» o la «a» és més petit en proporció a la lletra. Es marca
            # la línia clarament més gruixuda que la majoria de la caixa.
            negretes = set()
            if res:
                gruixos = []
                for idx, (L, g) in enumerate(zip(visibles, res)):
                    # Només lletra amb minúscules: els rètols i les línies
                    # d'acords estranyes, en majúscules, ja es tracten a part.
                    if L['tipus'] == 'lletra' and re.search(r'[a-zà-ú]', L['text']):
                        gr = gruix([c for f in g for c in f['cs']])
                        if gr is not None:
                            gruixos.append((idx, gr))
                # Les línies normals varien una mica segons les lletres que
                # tenen; la negrita en queda separada per un salt clar. Es
                # busca el salt més gran i només compta si és prou gran.
                vals = sorted(r for _, r in gruixos)
                if len(vals) >= 3:
                    salt, tall = max((vals[i + 1] - vals[i], i) for i in range(len(vals) - 1))
                    if vals[tall] < vals[tall + 1] * 0.84:
                        negretes = {idx for idx, r in gruixos if r <= vals[tall]}
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
                marca = NEGRETA if (vi - 1) in negretes else ''
                # Síl·labes en negreta dins la línia (no a les que ja ho són senceres).
                marques = negreta_linia(lt, fl) if fl and not marca else []
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
                    estrofa.append(marca + posa_negreta(linia, marques))
                elif pendents:
                    estrofa.append(marca + ' '.join('[' + a + ']' for a, _ in pendents) + ' ' + posa_negreta(lt, marques))
                else:
                    estrofa.append(marca + posa_negreta(lt, marques))
                pendents = None
            if pendents:
                estrofa.append(' '.join('[' + a + ']' for a, _ in pendents))
            if estrofa:
                blocs.append(estrofa)
    # Qui marcava les síl·labes fortes ho feia a tota la cançó: una sola marca
    # és soroll de la mesura.
    if sum(l.count('<b>') for b in blocs for l in b) < 2:
        blocs = [[re.sub(r'</?b>', '', l) for l in b] for b in blocs]
    return escriu(blocs, titol)


def escriu(blocs, titol):
    """Estrofes (llistes de línies ChordPro) → text ChordPro, amb tornades i rètols."""
    out = ['{title: ' + titol + '}', '']

    def net(l):
        """Només el text de la lletra: sense acords, negretes ni marca interna."""
        return re.sub(r'\[[^\]]*\]|</?b>', '', l).replace(NEGRETA, '').strip()

    def es_maj(l):
        # Les indicacions de repetició, «(x2)» o «(bis)», no compten.
        t = re.sub(r'\((?:x\s*\d+|\d+\s*x|bis)\)', '', net(l), flags=re.I).strip()
        return bool(t) and t == t.upper() and re.search(r'[A-ZÀ-Ú]{3}', t) is not None

    def destaca(l):
        # La tornada es reconeix perquè va en majúscules o en negreta.
        return l.startswith(NEGRETA) or es_maj(l)
    partits = []
    for b in blocs:
        b = [re.sub(r'(?<=\S)  +', ' ', l).rstrip() for l in b]
        tros = [[b[0]]]
        for l in b[1:]:
            if destaca(l) != destaca(tros[-1][-1]) and net(l):
                tros.append([l])
            else:
                tros[-1].append(l)
        partits += tros
    blocs = partits
    for b in blocs:
        if len(b) == 1 and '[' not in b[0] and es_maj(b[0]) and len(net(b[0])) <= 40:
            out.append('{comment: ' + net(b[0]).capitalize() + '}')
            out.append('')
            continue
        tornada = all(destaca(l) for l in b if net(l))
        if tornada:
            out.append('{start_of_chorus}')
        out += [l.replace(NEGRETA, '') for l in b]
        if tornada:
            out.append('{end_of_chorus}')
        out.append('')
    return '\n'.join(out).rstrip() + '\n'

if __name__ == '__main__':
    slides = json.load(open(sys.argv[1]))
    print(converteix(slides, sys.argv[2]), end='')
    for a in avisos:
        print('AVÍS:', a, file=sys.stderr)
