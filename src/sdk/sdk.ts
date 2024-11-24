import { Web3Stash } from "../web3stash/index";
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { NodeType, EncryptedNode } from "../db/types";
import { GunMogu } from "../db/gunDb";
import { initializeGun, initGun } from '../config/gun';

export { EncryptedNode, NodeType };

interface MoguOptions {
  key?: string;
  storageService?: Web3StashServices;
  storageConfig?: Web3StashConfig;
  server?: any;
}

export class Mogu {
  private gun: GunMogu;
  private storageService?: any;
  private lastBackupHash?: string;

  constructor(options: MoguOptions = {}) {
    const { key, storageService, storageConfig, server } = options;
    const gunInstance = server ? initGun(server) : initializeGun();
    this.gun = new GunMogu(gunInstance, key || '');
    
    if (storageService && storageConfig) {
      this.storageService = Web3Stash(storageService, storageConfig);
    }
  }

  // Aggiungiamo il metodo login
  async login(username: string, password: string) {
    return this.gun.authenticate(username, password);
  }

  // Metodi base - usa direttamente Gun
  async put(path: string, data: any) {
    const ref = this.gun.getGunInstance().get('nodes').get(path);
    return new Promise((resolve) => {
      ref.put(data, (ack: any) => resolve(ack));
    });
  }

  async get(path: string) {
    const ref = this.gun.getGunInstance().get('nodes').get(path);
    return new Promise<any>((resolve) => {
      ref.once((data: any) => resolve(data));
    });
  }

  on(path: string, callback: (data: any) => void) {
    this.gun.getGunInstance().get('nodes').get(path).on(callback);
  }

  // Backup su IPFS - salva i dati raw di Gun
  async backup() {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      if (this.lastBackupHash) {
        try {
          await this.storageService.unpin(this.lastBackupHash);
          console.log("Previous backup unpinned:", this.lastBackupHash);
        } catch (err) {
          console.warn("Failed to unpin previous backup:", err);
        }
      }

      // Ottieni i dati raw da Gun
      const rawData = await new Promise<any>((resolve) => {
        this.gun.getGunInstance().get('nodes').once(async (data: any) => {
          const cleanData: Record<string, any> = {};
          
          // Processa ogni nodo in modo sincrono
          for (const [key, value] of Object.entries(data || {})) {
            if (key !== '_' && value && typeof value === 'object') {
              // Ottieni il valore effettivo del nodo
              const nodeValue = await new Promise<{
                value: any;
                type: string;
                name: string;
                id: string;
              }>((resolveNode) => {
                this.gun.getGunInstance().get('nodes').get(key).once((node: any) => {
                  resolveNode({
                    value: node.value,
                    type: node.type || 'NODE',
                    name: node.name || key,
                    id: key
                  });
                });
              });
              
              if (nodeValue.value !== undefined) {
                cleanData[key] = nodeValue;
              }
            }
          }
          
          resolve(cleanData);
        });
      });

      console.log("Data to backup:", rawData);

      // Usa web3stash per il backup
      const result = await this.storageService.uploadJson(rawData);
      this.lastBackupHash = result.id;
      console.log("New backup created with hash:", result.id);
      return result.id;
    } catch (err) {
      console.error("Backup failed:", err);
      throw err;
    }
  }

  async restore(hash: string) {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      // Usa web3stash per il restore
      const response = await this.storageService.uploadJson({ method: 'GET', hash });
      console.log("Raw response:", response);

      // Estrai i dati dalla risposta
      let data;
      if (response.metadata?.IpfsHash) {
        // Se abbiamo un hash IPFS, fai un'altra richiesta per ottenere i dati effettivi
        const dataResponse = await this.storageService.uploadJson({ 
          method: 'GET', 
          hash: response.metadata.IpfsHash 
        });
        data = dataResponse.data || dataResponse;
      } else {
        data = response.data || response;
      }

      console.log("Restored data:", data);

      if (!data || typeof data !== 'object') {
        throw new Error("Invalid backup data format");
      }

      // Ripristina i dati in Gun
      const gun = this.gun.getGunInstance();
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object') {
          await new Promise<void>((resolve) => {
            gun.get('nodes').get(key).put(value, () => resolve());
          });
        }
      }

      this.lastBackupHash = hash;

      // Attendi che i dati siano sincronizzati
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Aggiorna lo stato interno
      this.gun.setState(new Map(Object.entries(data)));

      return data;
    } catch (err) {
      console.error("Restore failed:", err);
      throw err;
    }
  }

  // Metodo per rimuovere esplicitamente un backup
  async removeBackup(hash: string) {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      await this.storageService.unpin(hash);
      if (this.lastBackupHash === hash) {
        this.lastBackupHash = undefined;
      }
      console.log("Backup removed:", hash);
    } catch (err) {
      console.error("Failed to remove backup:", err);
      throw err;
    }
  }

  // Metodi di utilità
  getGun() {
    return this.gun.getGunInstance();
  }

  getState() {
    return this.gun.getState();
  }
}
