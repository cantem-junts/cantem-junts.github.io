#!/usr/bin/env python3
"""Treu del TiddlyWiki antic (cants.tiddlyhost.com) les dades per a la migració.

Ús: extreu.py index.html CARPETA
Escriu CARPETA/presentacions.json (cançons que són una presentació de Google) i
CARPETA/text.json (cançons de text amb els acords a sobre, ja sense marcatge).
"""
import html, json, re, sys

s = open(sys.argv[1], encoding='utf-8').read()
tids = []
for b in re.findall(r'<script class="tiddlywiki-tiddler-store" type="application/json">(.*?)</script>', s, re.S):
    tids += json.loads(b)
tids = [t for t in tids if not t.get('title', '').startswith('$:/')]


def neteja(s):
    s = s.replace('\xa0', ' ').replace('&nbsp;', ' ')
    s = re.sub(r'@@[^;\n]*(;[^;\n]*)*;', '', s)
    s = s.replace('@@', '')
    s = re.sub(r'</?(code|big|b|i|u|small|span|div|p|center|font)[^>]*>', '', s)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = s.replace("''", '').replace('<<<', '').replace('//', '')
    return html.unescape(s)


pres, text = [], []
for t in tids:
    tx = t.get('text', '')
    m = re.search(r'docs.google.com/presentation/d/e/([A-Za-z0-9_-]+)', tx)
    if m:
        pres.append({'titol': t['title'], 'id': m.group(1), 'tags': t.get('tags', '')})
    elif (not tx.startswith(('iVBOR', '/9j/')) and '{{' not in tx and '<<toc' not in tx
          and re.search(r'^[ .]*(do|re|mi|fa|sol|la|si)[#b]?m?7?\b', neteja(tx), re.M | re.I)):
        text.append({'titol': t['title'], 'tags': t.get('tags', ''), 'text': neteja(tx)})
json.dump(pres, open(f'{sys.argv[2]}/presentacions.json', 'w'), ensure_ascii=False, indent=0)
json.dump(text, open(f'{sys.argv[2]}/text.json', 'w'), ensure_ascii=False, indent=1)
print(len(pres), 'presentacions,', len(text), 'cançons de text')
