import express from 'express';
import { createApp } from './api/api';
import { initGun } from './config/gun';
import { GunMogu } from './db/gunDb';

const port = process.env.PORT || 8765;

// Inizializza il server HTTP
const startServer = () => {
  // Crea l'app Express
  const app = express();

  // Crea il server HTTP
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Inizializza Gun con il server
  const gunInstance = initGun(server);
  const gunDb = new GunMogu(gunInstance);

  // Aggiungi il middleware per Gun
  app.use('/gun', (req, res) => {
    if (req.url === '/gun' && req.method === 'GET') {
      res.status(200).send('Gun server is running');
      return;
    }
    // Cast gunInstance a any per accedere a web
    (gunInstance as any).web?.(req, res);
  });

  // Crea l'app con le route API
  const appWithRoutes = createApp(gunDb);
  app.use(appWithRoutes);

  return { app, server, gun: gunInstance };
};

// Esporta le istanze
export const { app, server, gun } = startServer(); 