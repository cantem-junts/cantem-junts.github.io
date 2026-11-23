# 9. Entrada amb el compte de GitHub per editar

Data: 2026-11-23 · Estat: acceptada (substitueix la clau manual de l'ADR 3)

## Context

Per desar, l'editor necessita una clau de GitHub amb permís d'escriptura al
repositori. Fins ara cadascú creava una clau personal a GitHub i l'enganxava a
«Per editar»: massa passos per a qui no és tècnic. Juanjo volia que bastés
d'entrar amb el compte de GitHub, com a eXeLearning per a GitHub.

GitHub lliura la clau d'usuari (OAuth) només a canvi del secret de
l'aplicació, i el seu punt d'intercanvi (`github.com/login/oauth/access_token`)
no té CORS: el navegador no hi pot parlar. Des del juliol de 2025 admet PKCE,
però continua demanant el secret.

## Decisió

- **Aplicació de GitHub «Cantem junts»** (slug `cantem-junts`, de
  l'organització), instal·lada només al repositori del cançoner, amb permís de
  contingut en lectura i escriptura i res més. Creada amb el flux de manifest.
- **Intercanvi al hosting de Juanjo**: `servidor/token.php`, publicat a
  `https://bilateria.org/app/cantem-junts/token.php`, amb el secret a
  `config.php` al costat (no es versiona; model a `servidor/config.example.php`).
  Només accepta peticions de `https://cantem-junts.github.io` (i de
  `http://localhost:8765` per provar), limita la clau al repositori i no guarda
  res.
- **A la web** (`js/desament.js`): «Entra amb GitHub» obre una finestra de
  GitHub amb PKCE; GitHub torna a `auth.html`, que passa el codi a la web.
  Si el navegador bloqueja la finestra, la mateixa pestanya hi va i torna.
  Després es comprova que el compte pot escriure al repositori. La clau (vuit
  hores) i la de renovació es guarden al navegador; quan caduca, es renova
  sola a través del mateix `token.php`.

## Alternatives descartades

- Seguir amb la clau personal enganxada: funciona, però és difícil.
- Un Worker de Cloudflare, com eXeLearning per a GitHub: és un tercer; el
  hosting propi fa el mateix i no depèn de casa (el NAS).

## Conseqüències

- Pot editar qui és de l'organització `cantem-junts` amb permís d'escriptura
  al repositori. Per donar accés a algú, se l'afegeix a l'organització.
- Si cal canviar el secret: es genera un altre a la configuració de
  l'aplicació a GitHub i es posa a `config.php` del hosting.

## Evidència

- Punt d'intercanvi sense CORS, comprovat el 23-11-2026: una petició
  `OPTIONS` amb `Origin: https://cantem-junts.github.io` torna 404 sense
  capçaleres `Access-Control-*`.
- PKCE a GitHub i manca de CORS: https://github.com/orgs/community/discussions/15752
- Mateix disseny a eXeLearning per a GitHub (github.exelearning.dev): aplicació
  de GitHub, PKCE i un Worker amb el secret (`worker/index.ts`).
- `token.php` desplegat: amb un codi fals, GitHub respon
  `bad_verification_code` (arriba a GitHub i hi afegeix el secret); des d'un
  altre origen respon 403; `config.php` no mostra res.

## Riscos i limitacions

- La clau es guarda a `localStorage`: la web no carrega res de tercers, que és
  el que la podria llegir.
- Si el hosting cau, no es pot entrar ni renovar la sessió; la web es pot
  continuar llegint.

## Validació

Entrada real amb el compte de Juanjo i un desament des de la web.
