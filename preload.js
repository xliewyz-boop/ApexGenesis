const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_JSON = new Set([
  'teams.json', 'players.json', 'tournaments.json',
  'news.json', 'mechanics.json', 'rank-training.json', 'shop.json', 'profile.json'
]);

function loadJSON(filename) {
  if (typeof filename !== 'string' || !ALLOWED_JSON.has(filename)) {
    return Promise.reject(new Error('Unsupported data file'));
  }
  return ipcRenderer.invoke('apex:load-json', filename);
}

function fetchOfficialNews() {
  return ipcRenderer.invoke('apex:fetch-official-news');
}

contextBridge.exposeInMainWorld('apexAPI', Object.freeze({ loadJSON, fetchOfficialNews }));
