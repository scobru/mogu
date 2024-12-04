import { create } from 'ipfs-core';
import type { IPFS } from 'ipfs-core';

(async () => {
  let node: IPFS | undefined;

  try {
    // Crea un nodo IPFS
    node = await create({
      start: true,
      EXPERIMENTAL: {
        ipnsPubsub: true
      }
    });

    if (!node) {
      throw new Error("Impossibile creare il nodo IPFS");
    }

    console.log("Nodo IPFS avviato con successo!");

    // Ottieni l'ID del nodo
    const id = await node.id();
    console.log("ID del nodo:", id.id);

  } catch (error) {
    console.error("Errore:", error);
  } finally {
    // Verifica se il nodo è stato creato prima di tentare di chiuderlo
    if (node) {
      await node.stop();
      console.log("Nodo IPFS chiuso.");
    }
  }
})();
