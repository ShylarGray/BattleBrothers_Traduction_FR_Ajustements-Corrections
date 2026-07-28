/* =========================================================================
 * Assemble le jeu en une page HTML autonome.
 *
 *   node tools/build-single-file.js [sortie.html]
 *
 * L'ordre de chargement des scripts est lu depuis index.html, ce qui évite
 * qu'un nouveau fichier soit oublié ici après avoir été ajouté au jeu.
 * Le résultat ne référence aucune ressource externe : il s'ouvre depuis un
 * disque, un partage de fichiers ou n'importe quel hébergeur statique.
 * ====================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'couronne-du-dragon.html');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/** Extrait, dans l'ordre, les chemins locaux d'un attribut donné. */
function refs(attr, ext) {
  const re = new RegExp(attr + '="([^"]+\\.' + ext + ')"', 'g');
  const out = [];
  let m;
  while ((m = re.exec(indexHtml))) if (!m[1].startsWith('http') && !m[1].startsWith('data:')) out.push(m[1]);
  return out;
}

const cssFiles = refs('href', 'css');
const jsFiles = refs('src', 'js');

if (!jsFiles.length) {
  console.error('Aucun script trouvé dans index.html — build interrompu.');
  process.exit(1);
}

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.error('Fichier référencé mais absent : ' + rel);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

const css = cssFiles.map(f => '/* ===== ' + f + ' ===== */\n' + read(f)).join('\n\n');

// Une balise </script> à l'intérieur d'une chaîne JavaScript fermerait le bloc
// prématurément : on la neutralise.
const js = jsFiles
  .map(f => '/* ===== ' + f + ' ===== */\n' + read(f))
  .join('\n;\n')
  .replace(/<\/script>/gi, '<\\/script>');

const title = (indexHtml.match(/<title>([^<]*)<\/title>/) || [, 'La Couronne du Dragon'])[1];

// Le corps est repris tel quel depuis index.html, scripts exclus : la structure
// DOM du jeu reste la seule source de vérité.
const body = (indexHtml.match(/<body>([\s\S]*?)<\/body>/) || [, ''])[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .trim();

// La déclaration d'encodage doit être dans le premier kilo-octet du document,
// sinon le navigateur l'ignore. Sans elle, un serveur qui n'annonce pas de
// charset fait lire l'UTF-8 comme du Latin-1 : « héros » devient « hÃ©ros ».
const page = `<meta charset="utf-8">
<title>${title}</title>
<style>
${css}
</style>

${body}

<script>
/* Le jeu peut tourner dans une iframe : on s'assure que le clavier lui parvient
   dès le premier clic, sans quoi les touches partiraient à la page hôte. */
window.addEventListener('pointerdown', function () {
  try { window.focus(); } catch (e) { /* sans conséquence */ }
});
</script>
<script>
${js}
</script>
`;

fs.writeFileSync(OUT, page);
const kb = (Buffer.byteLength(page) / 1024).toFixed(0);
console.log('Écrit : ' + OUT + ' (' + kb + ' Ko)');
console.log('  ' + cssFiles.length + ' feuille(s) de style et ' + jsFiles.length + ' script(s) fusionnés.');
