import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/then';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';
import path from 'path';
import os from 'os';

// Definisci l'interfaccia per le opzioni di Gun
interface GunOptions {
  web?: any;
  localStorage?: boolean;
  radisk?: boolean;
  file?: string;
  multicast?: boolean;
  axe?: boolean;
  peers?: string[];
  debug?: boolean;
}

export const initGun = (server: any) => {
  // Usa una directory temporanea del sistema per i file radata
  const radataPath = path.join(os.tmpdir(), 'mogu-radata');
  
  const options: GunOptions = {
    web: server,
    localStorage: false,
    radisk: true,
    file: radataPath,
    multicast: false,
    axe: false,
    peers: server ? undefined : ['http://localhost:8765/gun'],
    debug: false
  };

  const gun = Gun(options);

  // Usa il metodo on solo per gli errori critici
  (gun as any).on('error', (err: any) => {
    if (err && err.code !== 'EPERM') {
      console.error('Critical Gun error:', err);
    }
  });

  return gun;
}; 