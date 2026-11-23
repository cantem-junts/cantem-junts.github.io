# 3. L'editor desa directament a GitHub

- Estat: acceptada; la clau manual, substituïda per l'entrada amb GitHub de l'[ADR 9](0009-entrada-amb-github.md)
- Data: 2026-11-22

## Context

La web no té servidor propi. Les alternatives eren un gestor com Decap CMS,
que necessita un servidor intermediari per entrar a GitHub, o que l'editor
generés el fitxer i calgués pujar-lo a mà, amb més passos cada vegada.

## Decisió

L'editor desa amb l'API de continguts de GitHub, amb una clau personal de
GitHub limitada al repositori i al permís de continguts, que qui edita posa
una vegada en cada navegador (pàgina «Per editar»). La clau es guarda només en
aquell navegador. Cada desament és un commit, i el flux de GitHub Actions
torna a publicar la web en un minut; mentrestant, el navegador que ha desat
mostra ja el canvi.

Per provar a l'ordinador, `scripts/servidor-local.py` fa el mateix paper i
desa a la còpia local.

## Conseqüències

- Historial de tots els canvis i possibilitat de desfer-los des de GitHub.
- Qui edita necessita un compte de GitHub i crear la clau una vegada.
- Una cançó no es pot esborrar si una celebració la fa servir.
