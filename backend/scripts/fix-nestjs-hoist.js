// npm (avec --legacy-peer-deps) hoiste parfois certains paquets @nestjs/*
// vers le node_modules racine du monorepo sans leurs dépendances (peer ou
// non) à côté — typiquement @nestjs/core ou reflect-metadata — ce qui casse
// leur résolution au runtime ("Cannot find package '@nestjs/core'" ou
// similaire) tout en laissant `tsc`/`nest build` passer sans erreur
// (vérification type-only, pas d'exécution réelle des imports).
//
// backend/ est le seul workspace de ce monorepo à dépendre de @nestjs/*, donc
// la règle est simple : tout paquet @nestjs/* qui se retrouve à la racine
// doit être reniché dans backend/node_modules, à côté de @nestjs/core et
// reflect-metadata qui y restent toujours (aucun autre workspace n'en a
// besoin). Ce script, lancé automatiquement après chaque `npm install`,
// corrige ça sans intervention manuelle.
import {existsSync, readdirSync, renameSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(backendRoot, '..');

const rootScope = join(repoRoot, 'node_modules', '@nestjs');
const backendScope = join(backendRoot, 'node_modules', '@nestjs');

if (!existsSync(rootScope)) {
  process.exit(0);
}

let moved = [];
for (const pkg of readdirSync(rootScope)) {
  const hoisted = join(rootScope, pkg);
  const nested = join(backendScope, pkg);
  if (!existsSync(nested)) {
    renameSync(hoisted, nested);
    moved.push(pkg);
  }
}

if (moved.length > 0) {
  console.log(
    `[postinstall] re-niché dans backend/node_modules (à côté de @nestjs/core) : ${moved.map((p) => `@nestjs/${p}`).join(', ')}`,
  );
}
