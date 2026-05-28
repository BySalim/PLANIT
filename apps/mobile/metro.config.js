// Metro config monorepo (pnpm) — restreint le scan aux dossiers utiles au mobile
// et bloque explicitement les builds des autres apps (apps/web/.next, apps/backend/dist).
// Sans cette config, Metro scanne tout le workspace et crashe sur les artefacts
// Next.js (race condition sur les Route Groups compilés à la demande).
// Voir docs/runbooks/mobile-monorepo-setup.md
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot, path.resolve(workspaceRoot, 'packages')];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  new RegExp(`^${escapeRe(path.resolve(workspaceRoot, 'apps', 'web'))}.*$`),
  new RegExp(`^${escapeRe(path.resolve(workspaceRoot, 'apps', 'backend'))}.*$`),
  new RegExp(`^${escapeRe(path.resolve(workspaceRoot, 'apps', 'whatsapp-bot'))}.*$`),
];

module.exports = config;
