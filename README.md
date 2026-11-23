# Cantem junts

Cançoner de cants per a la missa, amb la lletra i els acords. Substituirà
[cants.tiddlyhost.com](https://cants.tiddlyhost.com/).

- **Cercador** pel títol o per qualsevol tros de la lletra, i filtre per temes.
- **Cada cançó** amb els acords damunt de la síl·laba, també al mòbil: si la
  línia no hi cap, l'acord salta amb la seva síl·laba.
- **Canvi de to** amb un botó, i acords en notació llatina (DO, lam) o
  americana (C, Am). Cada dispositiu recorda el to triat de cada cançó.
- **Celebracions**: la llista de cants d'una missa, en ordre, amb el moment
  de cadascun (Entrada, Glòria…) i textos com el salm.
- **Faristol**: per tocar a la missa amb la tauleta o el mòbil. La cançó o la
  celebració a pantalla completa, amb la lletra tan grossa com hi càpiga, i
  es passa pàgina tocant la meitat dreta (o amb un pedal). La pantalla no
  s'apaga.
- **Editor** a la mateixa web: s'enganxa la lletra amb els acords a sobre i
  es col·loquen sols, o es toca la síl·laba i es tria l'acord.

## Com s'afegeix una cançó

Des de la web, amb el botó «Nova». Abans, una sola vegada en cada navegador,
cal donar-li permís per escriure al repositori: ho explica la pàgina «Per
editar», al peu de la web. La cançó es publica en un minut.

## Format

Cada cançó és un fitxer de text a `cancons/` en format
[ChordPro](https://www.chordpro.org/chordpro/), i cada celebració, a
`celebracions/`:

```
{title: Aixeca els ulls}
{meta: etiquetes Nadal}

[DO]Si cerques quelcom a la [mi m]vida [FA]que et faci [SOL]viure content

{start_of_chorus}
VINE AMB [FA]MI, AMIC [DO]MEU [FA]FAREM JUNTS EL [SOL]CAMÍ.
{end_of_chorus}
```

Una celebració cita les cançons pel nom del fitxer: `{comment: Entrada}` i
`{cant: aixeca-els-ulls}`.

## Provar-ho a l'ordinador

```
python3 scripts/servidor-local.py      # http://localhost:8765, editor inclòs
npm test                               # proves dels acords
```

Amb el servidor local, l'editor desa els canvis a les carpetes d'aquesta
còpia, sense passar per GitHub.

## Llicència

El codi, [AGPL 3.0 o posterior](LICENSE). Les lletres i les músiques dels
cants són dels seus autors.

Programa fet amb IA ([MIAE nivell 4](https://jjdeharo.github.io/miae/?nivel=4)).
