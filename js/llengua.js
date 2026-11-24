// SPDX-License-Identifier: AGPL-3.0-or-later
// Llengua de la interfície: català o castellà (ADR 10). Els textos s'escriuen
// en català al codi, dins de t(); aquí hi ha la traducció al castellà. Les
// cançons i les celebracions no es tradueixen.

const CLAU = 'cantem.llengua';
const LLENGUES = ['ca', 'es'];

// Castellà de cada text català de la interfície. {0}, {1}… són les dades que
// s'hi posen (un nom, un nombre, un enllaç). Un text que no hi és surt en català.
const ES = {
  // Capçalera i peu (auth.html porta la seva traducció)
  'Afegeix una cançó nova': 'Añade una canción nueva',
  'Nova': 'Nueva',
  'Passa al tema clar': 'Pasa al tema claro',
  'Passa al tema fosc': 'Pasa al tema oscuro',
  'Programa fet amb IA': 'Programa hecho con IA',
  'MIAE nivell 4': 'MIAE nivel 4',
  'Codi': 'Código',
  'Privadesa': 'Privacidad',
  'Crèdits': 'Créditos',
  'Per editar': 'Para editar',
  "No s'han pogut carregar les cançons. {0}": 'No se han podido cargar las canciones. {0}',

  // Llista i cercador
  'Cerca pel títol o per un tros de la lletra': 'Busca por el título o por un trozo de la letra',
  'Cerca': 'Buscar',
  'Cants ({0})': 'Cantos ({0})',
  'Celebracions ({0})': 'Celebraciones ({0})',
  "Cada celebració recull els cants d'una missa, en ordre.": 'Cada celebración recoge los cantos de una misa, en orden.',
  'Encara no hi ha cap celebració.': 'Todavía no hay ninguna celebración.',
  'Nova celebració': 'Nueva celebración',
  'Filtra per tema': 'Filtra por tema',
  '1 cançó': '1 canción',
  '{0} cançons': '{0} canciones',
  'No hi ha cap cançó que coincideixi.': 'No hay ninguna canción que coincida.',

  // Cançó i celebració
  'Torna a la llista': 'Vuelve a la lista',
  "No s'ha trobat aquesta cançó.": 'No se ha encontrado esta canción.',
  "No s'ha trobat aquesta celebració.": 'No se ha encontrado esta celebración.',
  'Edita aquesta cançó': 'Edita esta canción',
  'Edita aquesta celebració': 'Edita esta celebración',
  'Aquesta cançó ja no hi és.': 'Esta canción ya no está.',
  'Pantalla completa amb la lletra grossa, per tocar: toca la dreta per passar pàgina': 'Pantalla completa con la letra grande, para tocar: toca la derecha para pasar página',
  'Faristol': 'Atril',
  'To': 'Tono',
  'Baixa mig to': 'Baja medio tono',
  'Puja mig to': 'Sube medio tono',
  'Torna al to original': 'Vuelve al tono original',
  'Torna al to original ({0})': 'Vuelve al tono original ({0})',
  'To original': 'Tono original',
  'Notació dels acords': 'Notación de los acordes',
  'Acords en notació llatina (DO, RE, MI)': 'Acordes en notación latina (DO, RE, MI)',
  'Acords en notació americana (C, D, E)': 'Acordes en notación americana (C, D, E)',
  'Mida de la lletra': 'Tamaño de la letra',
  'Lletra més petita': 'Letra más pequeña',
  'Lletra més gran': 'Letra más grande',
  'Torna a la mida de sèrie': 'Vuelve al tamaño predeterminado',
  'Mostra o amaga els acords': 'Muestra u oculta los acordes',
  'Imprimeix o desa en PDF': 'Imprime o guarda en PDF',
  "Comparteix l'enllaç": 'Comparte el enlace',
  'Enllaç copiat': 'Enlace copiado',

  // Faristol
  'Faristol: {0}': 'Atril: {0}',
  'Torna a la mida que omple la pantalla': 'Vuelve al tamaño que llena la pantalla',
  'Surt del faristol': 'Sal del atril',

  // Selector d'acords
  'Acord al final de la línia': 'Acorde al final de la línea',
  'Tria un acord': 'Elige un acorde',
  'Canvia {0}': 'Cambia {0}',
  'Posa un acord': 'Pon un acorde',
  'Tanca': 'Cierra',
  'Sostingut': 'Sostenido',
  'Bemoll': 'Bemol',
  'Sèptima': 'Séptima',
  'Acord': 'Acorde',
  "Escriu l'acord": 'Escribe el acorde',
  'Posa': 'Pon',
  'Treu aquest acord': 'Quita este acorde',

  // Editor de cançons
  'Torna sense desar': 'Vuelve sin guardar',
  'Edita la cançó': 'Edita la canción',
  'Cançó nova': 'Canción nueva',
  'Títol': 'Título',
  'Temes': 'Temas',
  'Per exemple: {0}': 'Por ejemplo: {0}',
  'Separats per comes. Serveixen per filtrar la llista.': 'Separados por comas. Sirven para filtrar la lista.',
  'Lletra': 'Letra',
  'Acords': 'Acordes',
  'Marcar': 'Marcar',
  "Escriu o enganxa la lletra. Si l'enganxes amb els acords a la línia de sobre, es col·loquen sols damunt de cada síl·laba. Una línia en blanc separa les estrofes.":
    'Escribe o pega la letra. Si la pegas con los acordes en la línea de encima, se colocan solos sobre cada sílaba. Una línea en blanco separa las estrofas.',
  'Tornada': 'Estribillo',
  'Negreta': 'Negrita',
  'N': 'N',
  'Negreta: toca una síl·laba per posar-la o treure-la en negreta (la síl·laba forta)': 'Negrita: toca una sílaba para ponerla o quitarla en negrita (la sílaba fuerte)',
  'Tornada: toca una estrofa per fer-la tornada, o per desfer-la': 'Estribillo: toca una estrofa para convertirla en estribillo, o para deshacerlo',
  'Nota: toca una línia per posar-hi una nota a sobre, o una nota per canviar-ne el text': 'Nota: toca una línea para ponerle una nota encima, o una nota para cambiar su texto',
  'Text de la nota': 'Texto de la nota',
  'Escriu primer el text de la nota.': 'Escribe primero el texto de la nota.',
  'Nota': 'Nota',
  'Dues vegades': 'Dos veces',
  "Tria una eina de la barra i toca la lletra: un acord va a la síl·laba que toquis; «N» hi posa o hi treu la negreta; «Tornada» converteix l'estrofa en tornada o la desfà, i «Nota» n'hi posa una a sobre. La goma treu els acords i les notes. Per moure un acord, arrossega'l (al mòbil, mantén-lo premut un moment).":
    'Elige una herramienta de la barra y toca la letra: un acorde va a la sílaba que toques; «N» le pone o le quita la negrita; «Estribillo» convierte la estrofa en estribillo o lo deshace, y «Nota» le pone una encima. La goma quita los acordes y las notas. Para mover un acorde, arrástralo (en el móvil, mantenlo pulsado un momento).',
  'Desa': 'Guarda',
  'Esborra': 'Borra',
  'Aquí es veurà la lletra amb els acords.': 'Aquí se verá la letra con los acordes.',
  'Canvis sense desar': 'Cambios sin guardar',
  'Acords col·locats damunt de la lletra. Revisa-ho a «Marcar».': 'Acordes colocados sobre la letra. Revísalo en «Marcar».',
  'Posa {0} on toquis': 'Pon {0} donde toques',
  'Un acord que no és a la barra': 'Un acorde que no está en la barra',
  'Altre': 'Otro',
  'Menors': 'Menores',
  'Mostra la fila dels acords menors': 'Muestra la fila de los acordes menores',
  'Amaga la fila dels acords menors': 'Oculta la fila de los acordes menores',
  'Goma: treu l’acord o la nota que toquis': 'Goma: quita el acorde o la nota que toques',
  "Desfés l'últim canvi": 'Deshaz el último cambio',
  'Tria primer una eina de la barra.': 'Elige primero una herramienta de la barra.',
  'Cal posar un títol.': 'Hay que poner un título.',
  'Desant…': 'Guardando…',
  'Desat': 'Guardado',
  "Desat. La web pública s'actualitzarà en un minut.": 'Guardado. La web pública se actualizará en un minuto.',
  'Segur? Toca per esborrar-la': '¿Seguro? Toca para borrarla',
  "No es pot esborrar: és a {0}. Treu-la'n primer.": 'No se puede borrar: está en {0}. Quítala de ahí primero.',
  'Cançó esborrada': 'Canción borrada',
  'Hi ha canvis sense desar. Si canvies de llengua es perdran. Vols continuar?': 'Hay cambios sin guardar. Si cambias de idioma se perderán. ¿Quieres continuar?',

  // Editor de celebracions
  'Edita la celebració': 'Edita la celebración',
  'Celebració nova': 'Celebración nueva',
  'Per exemple: Inici de curs 2026-27': 'Por ejemplo: Inicio de curso 2026-27',
  'Detall': 'Detalle',
  'Data, lloc…': 'Fecha, lugar…',
  'Cants, en ordre': 'Cantos, en orden',
  'Afegeix un cant': 'Añade un canto',
  'Cerca pel títol o la lletra': 'Busca por el título o la letra',
  'Afegeix un text (salm, resposta…)': 'Añade un texto (salmo, respuesta…)',
  'Moment': 'Momento',
  'Entrada, Glòria, Ofertori…': 'Entrada, Gloria, Ofertorio…',
  'Text': 'Texto',
  'Puja': 'Sube',
  'Baixa': 'Baja',
  'Treu-lo de la llista': 'Quítalo de la lista',
  "Encara no hi ha cap cant. Cerca'ls a sota.": 'Todavía no hay ningún canto. Búscalos abajo.',
  'Cap cançó.': 'Ninguna canción.',

  // Accés per editar
  'Per editar el cançoner': 'Para editar el cancionero',
  'Ara la web està oberta amb el servidor local: els canvis es desen en aquest ordinador i no cal entrar.':
    'Ahora la web está abierta con el servidor local: los cambios se guardan en este ordenador y no hace falta entrar.',
  'Afegeix una cançó': 'Añade una canción',
  'Has entrat amb el compte de GitHub {0}: a cada cançó hi ha el llapis per editar-la i, a dalt, el botó «Nova».':
    'Has entrado con la cuenta de GitHub {0}: en cada canción está el lápiz para editarla y, arriba, el botón «Nueva».',
  'Surt': 'Sal',
  "Entra amb el teu compte de GitHub. Si formes part de l'organització {0} amb permís per escriure, podràs afegir i editar cançons des d'aquest navegador.":
    'Entra con tu cuenta de GitHub. Si formas parte de la organización {0} con permiso para escribir, podrás añadir y editar canciones desde este navegador.',
  'Entra amb GitHub': 'Entra con GitHub',
  "La primera vegada GitHub et demanarà que autoritzis l'aplicació «Cantem junts», que només pot escriure al cançoner. La sessió es queda en aquest navegador fins que surts.":
    'La primera vez GitHub te pedirá que autorices la aplicación «Cantem junts», que solo puede escribir en el cancionero. La sesión se queda en este navegador hasta que sales.',
  'Has sortit': 'Has salido',
  'Esperant GitHub…': 'Esperando a GitHub…',
  'Has entrat com a {0}: ja pots editar': 'Has entrado como {0}: ya puedes editar',

  // Privadesa i crèdits
  'Aquesta web no recull cap dada de qui la visita: no fa servir galetes, no compta visites i no carrega res de tercers.':
    'Esta web no recoge ningún dato de quien la visita: no usa cookies, no cuenta visitas y no carga nada de terceros.',
  'Les preferències (tema, llengua, notació dels acords, mida de la lletra, el to triat de cada cançó) es guarden només en el teu navegador.':
    'Las preferencias (tema, idioma, notación de los acordes, tamaño de la letra, el tono elegido de cada canción) se guardan solo en tu navegador.',
  "Qui edita el cançoner hi entra amb el seu compte de GitHub. La clau de la sessió es guarda només en el seu navegador i s'envia a GitHub per desar els canvis; per obtenir-la i renovar-la passa per un petit servei a bilateria.org, el hosting de l'autor, que no en guarda res.":
    'Quien edita el cancionero entra con su cuenta de GitHub. La clave de la sesión se guarda solo en su navegador y se envía a GitHub para guardar los cambios; para obtenerla y renovarla pasa por un pequeño servicio en bilateria.org, el hosting del autor, que no la guarda.',
  "La web està allotjada a GitHub Pages, que, com qualsevol servidor, rep l'adreça IP de qui hi entra. Ho explica a la {0}.":
    'La web está alojada en GitHub Pages, que, como cualquier servidor, recibe la dirección IP de quien entra. Lo explica en la {0}.',
  'declaració de privadesa de GitHub': 'declaración de privacidad de GitHub',
  'Les lletres i les músiques dels cants són dels seus autors.': 'Las letras y las músicas de los cantos son de sus autores.',
  'Programa fet amb IA ({0}). Codi amb llicència {1}.': 'Programa hecho con IA ({0}). Código con licencia {1}.',
  'Icones de {0}, amb llicència ISC.': 'Iconos de {0}, con licencia ISC.',
  'Les cançons es guarden en format {0}.': 'Las canciones se guardan en formato {0}.',

  // Desament (missatges d'error)
  'GitHub no ha donat accés.': 'GitHub no ha dado acceso.',
  "S'ha tancat la finestra de GitHub.": 'Se ha cerrado la ventana de GitHub.',
  "No s'ha pogut completar l'entrada amb GitHub.": 'No se ha podido completar la entrada con GitHub.',
  "El teu compte de GitHub no té permís per escriure al cançoner. Demana a qui l'administra que t'afegeixi a l'organització cantem-junts.":
    'Tu cuenta de GitHub no tiene permiso para escribir en el cancionero. Pide a quien lo administra que te añada a la organización cantem-junts.',
  'La sessió amb GitHub ha caducat. Torna a entrar a «Per editar».': 'La sesión con GitHub ha caducado. Vuelve a entrar en «Para editar».',
  'El teu compte no té permís per escriure al cançoner.': 'Tu cuenta no tiene permiso para escribir en el cancionero.',
  'Algú ha canviat aquest fitxer alhora. Torna a obrir-lo i repeteix el canvi.': 'Alguien ha cambiado este archivo a la vez. Vuelve a abrirlo y repite el cambio.',
  'GitHub ha respost {0}.': 'GitHub ha respondido {0}.',
};

// Botó de la capçalera: mostra la llengua a què es passa.
const BOTO = {
  ca: { text: 'ES', lang: 'es', title: 'Passa al castellà' },
  es: { text: 'CA', lang: 'ca', title: 'Pasa al catalán' },
};

function guardada() {
  try { const v = localStorage.getItem(CLAU); return LLENGUES.includes(v) ? v : null; } catch (e) { return null; }
}

// La primera llengua del sistema que sigui català o castellà; si no n'hi ha cap, català.
function delSistema() {
  const llista = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  for (const l of llista) {
    const base = String(l).toLowerCase().split('-')[0];
    if (LLENGUES.includes(base)) return base;
  }
  return 'ca';
}

export let llengua = guardada() || delSistema();

export function t(text, ...dades) {
  const s = llengua === 'es' && Object.hasOwn(ES, text) ? ES[text] : text;
  return dades.length ? s.replace(/\{(\d+)\}/g, (m, i) => (i < dades.length ? String(dades[i]) : m)) : s;
}

// Els textos fixos de l'HTML porten data-t (el text), data-t-title o
// data-t-placeholder. La primera vegada es guarda el català original.
const originals = new WeakMap();
const ATRIBUTS = { 'data-t-title': 'title', 'data-t-placeholder': 'placeholder', 'data-t-aria-label': 'aria-label' };
export function traduixEstatics(arrel = document) {
  document.documentElement.lang = llengua;
  const orig = (el) => { if (!originals.has(el)) originals.set(el, {}); return originals.get(el); };
  for (const el of arrel.querySelectorAll('[data-t]')) {
    const o = orig(el);
    if (o.text === undefined) o.text = el.textContent;
    el.textContent = t(o.text);
  }
  for (const [marca, atribut] of Object.entries(ATRIBUTS)) {
    for (const el of arrel.querySelectorAll(`[${marca}]`)) {
      const o = orig(el);
      if (o[atribut] === undefined) o[atribut] = el.getAttribute(atribut) || '';
      el.setAttribute(atribut, t(o[atribut]));
    }
  }
  const boto = document.getElementById('btn-llengua');
  if (boto) {
    const b = BOTO[llengua];
    boto.textContent = b.text;
    boto.lang = b.lang;
    boto.title = b.title;
    boto.setAttribute('aria-label', b.title);
  }
}

// Canvia la llengua i la recorda; si és la del sistema, no cal guardar-la.
export function canviaLlengua(nova) {
  if (!LLENGUES.includes(nova)) return;
  llengua = nova;
  try {
    if (nova === delSistema()) localStorage.removeItem(CLAU);
    else localStorage.setItem(CLAU, nova);
  } catch (e) { /* res */ }
  traduixEstatics();
}

export const altraLlengua = () => (llengua === 'ca' ? 'es' : 'ca');
