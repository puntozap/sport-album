let _albumType = 'fifa'; // 'fifa' | 'empresa'
let _empresaEntities = [];
let _empresaGroups = [];
let _empresaMeta = null;
let _freePlay = false; // false = demo (5 sobres), true = juego libre

export function setEmpresaAlbum({ meta, entities, groups }) {
  _albumType = 'empresa';
  _empresaMeta = meta;
  _empresaEntities = entities;
  _empresaGroups = groups;
  _freePlay = !!meta?.freePlay;
}

export function isFreePlay() { return _freePlay; }

export function isEmpresaMode() { return _albumType === 'empresa'; }
export function getEmpresaMeta() { return _empresaMeta; }
export function getEmpresaEntities() { return _empresaEntities; }
export function getEmpresaGroups() { return _empresaGroups; }

export function getActiveEntities() {
  if (_albumType === 'empresa') return _empresaEntities;
  // FIFA countries are imported lazily to avoid circular dep
  return null; // caller falls back to countries[]
}
