import express from 'express';
import { initGun } from './config/gun';
import { GunMogu } from './db/gunDb';

const port = process.env.PORT || 8765;

export const startServer = async () => {
  const app = express();
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Inizializza Gun con il server
  const gunInstance = initGun(server, {
    file: 'radata',  // Usa lo stesso path dell'SDK
  });
  
  const gunDb = new GunMogu(gunInstance);

  // Middleware minimo per Gun
  app.use('/gun', (req, res) => {
    gunInstance.web(req, res);
  });

  // Attendi che il server sia pronto
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { gunDb, server };
};

// Avvia il server se eseguito direttamente
if (require.main === module) {
  startServer().catch(console.error);
} 