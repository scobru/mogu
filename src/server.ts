import express from 'express';
import { createApp } from './api/api';
import { initGun } from './config/gun';
import { GunMogu } from './db/gunDb';

const port = process.env.PORT || 8765;

export const startServer = async () => {
  const app = express();
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
    gunInstance.web(req, res);
  });

  // Crea l'app con le route API
  const appWithRoutes = createApp(gunDb);
  app.use(appWithRoutes);

  // Attendi che il server sia pronto
  await new Promise(resolve => setTimeout(resolve, 2000));

  return { app, server, gunInstance, gunDb };
};

if (require.main === module) {
  startServer();
} 