#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Servidor per provar el cançoner a l'ordinador, editor inclòs.

Serveix la web i desa els canvis de l'editor a les carpetes cancons/ i
celebracions/ d'aquesta còpia, sense passar per GitHub. Després de cada canvi
refà dades/index.json.

    python3 scripts/servidor-local.py [port]       (per defecte, 8765)
"""
import http.server
import pathlib
import re
import subprocess
import sys
import urllib.parse

ARREL = pathlib.Path(__file__).resolve().parent.parent
RUTA_VALIDA = re.compile(r"^(cancons|celebracions)/[a-z0-9][a-z0-9-]*\.cho$")


def refes_index():
    subprocess.run(["node", str(ARREL / "scripts/index.mjs")], check=True, cwd=ARREL)


class Gestor(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ARREL), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _ruta(self):
        q = urllib.parse.urlparse(self.path)
        if q.path != "/api/fitxer":
            return None
        ruta = urllib.parse.parse_qs(q.query).get("ruta", [""])[0]
        return ruta if RUTA_VALIDA.match(ruta) else ""

    def _respon(self, codi, text=""):
        cos = text.encode()
        self.send_response(codi)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(cos)))
        self.end_headers()
        self.wfile.write(cos)

    def do_GET(self):
        if self.path.startswith("/api/local"):
            return self._respon(200, "local")
        return super().do_GET()

    def do_PUT(self):
        ruta = self._ruta()
        if not ruta:
            return self._respon(400, "Ruta no vàlida")
        llargada = int(self.headers.get("Content-Length", 0))
        text = self.rfile.read(llargada).decode("utf-8")
        (ARREL / ruta).write_text(text, encoding="utf-8")
        try:
            refes_index()
        except subprocess.CalledProcessError:
            return self._respon(500, "Desat, però l'índex no s'ha pogut refer")
        self._respon(200, "ok")

    def do_DELETE(self):
        ruta = self._ruta()
        if not ruta:
            return self._respon(400, "Ruta no vàlida")
        fitxer = ARREL / ruta
        if fitxer.exists():
            fitxer.unlink()
        refes_index()
        self._respon(200, "ok")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    refes_index()
    print(f"Cantem junts a http://localhost:{port}/")
    http.server.ThreadingHTTPServer(("0.0.0.0", port), Gestor).serve_forever()
