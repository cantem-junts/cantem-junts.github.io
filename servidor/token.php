<?php
// SPDX-License-Identifier: AGPL-3.0-or-later
// Intercanvi de claus de l'aplicació de GitHub «Cantem junts».
//
// La web és estàtica i GitHub demana el secret de l'aplicació per lliurar la
// clau d'usuari, i no deixa fer-ho des del navegador (no té CORS). Aquest
// fitxer fa només això: rep el codi (amb PKCE) o la clau de renovació, hi
// afegeix el secret i torna la resposta de GitHub. No guarda res.
// S'allotja a bilateria.org/app/cantem-junts/; el secret és a config.php, que
// no es versiona (vegeu config.example.php i l'ADR 9).

$config = require __DIR__ . '/config.php';
$origens = ['https://cantem-junts.github.io', 'http://localhost:8765'];
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (in_array($origen, $origens, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    header('Vary: Origin');
}

function respon(array $dades, int $codi): void {
    http_response_code($codi);
    echo json_encode($dades);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respon(['error' => 'method_not_allowed'], 405);
if (!in_array($origen, $origens, true)) respon(['error' => 'forbidden'], 403);

$cos = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($cos)) respon(['error' => 'invalid_request'], 400);

$params = ['client_id' => $config['client_id'], 'client_secret' => $config['client_secret']];
if (isset($cos['code']) && is_string($cos['code'])) {
    $params['code'] = $cos['code'];
    if (isset($cos['code_verifier']) && is_string($cos['code_verifier'])) $params['code_verifier'] = $cos['code_verifier'];
    if (isset($cos['redirect_uri']) && is_string($cos['redirect_uri']) && str_starts_with($cos['redirect_uri'], $origen . '/')) {
        $params['redirect_uri'] = $cos['redirect_uri'];
    }
    // La clau només val per al repositori del cançoner.
    if (!empty($config['repository_id'])) $params['repository_id'] = (string) $config['repository_id'];
} elseif (isset($cos['refresh_token']) && is_string($cos['refresh_token'])) {
    $params['grant_type'] = 'refresh_token';
    $params['refresh_token'] = $cos['refresh_token'];
} else {
    respon(['error' => 'invalid_request'], 400);
}

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($params),
    CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: cantem-junts'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
]);
$resposta = curl_exec($ch);
$estat = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$dades = is_string($resposta) ? json_decode($resposta, true) : null;
if (!is_array($dades)) respon(['error' => 'bad_gateway'], 502);
$camps = ['access_token', 'expires_in', 'refresh_token', 'refresh_token_expires_in', 'token_type', 'error', 'error_description'];
$sortida = array_intersect_key($dades, array_flip($camps));
respon($sortida, ($estat === 200 && empty($dades['error'])) ? 200 : 400);
