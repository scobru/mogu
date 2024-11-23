import Gun from 'gun';

// Funzione per registrare i plugin
export function registerGunPlugins() {
  // Prima i plugin core di Gun
  require('gun/sea');
  require('gun/lib/then');
  require('gun/lib/radix');
  require('gun/lib/radisk');
  require('gun/lib/store');
  require('gun/lib/rindexed');

  // Carica gun-eth se siamo in un browser
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gun-eth/src/gun-eth.js';
    document.head.appendChild(script);
    console.log("Gun-eth loading via CDN in browser");
  } else {
    console.log("Not in browser environment - gun-eth will not be loaded");
  }
} 