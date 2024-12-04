import { StorageService } from "./base-storage";
import type { UploadOutput } from "../types";
import { PinataSDK } from "pinata-web3";
import axios from "axios";
import { BackupData } from '../../types/mogu';
import fs from 'fs';

interface PinataOptions {
  pinataMetadata?: {
    name?: string;
    keyvalues?: Record<string, string | number | null>;
  };
}

export class PinataService extends StorageService {
  public serviceBaseUrl = "ipfs://";
  public readonly serviceInstance: PinataSDK;

  constructor(apiKey: string, apiSecret: string) {
    super();
    this.serviceInstance = new PinataSDK({
      pinataJwt: apiKey,
      pinataGateway: "gateway.pinata.cloud"
    });
  }

  public async get(hash: string): Promise<BackupData> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }

      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
      return response.data;
    } catch (error) {
      console.error('Errore nel recupero da Pinata:', error);
      throw error;
    }
  }

  public getEndpoint(): string {
    return "https://gateway.pinata.cloud/ipfs/";
  }

  public async unpin(hash: string): Promise<void> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      console.log(`Tentativo di unpin per l'hash: ${hash}`);
      
      // Prima verifica se è già unpinnato
      const isPinnedBefore = await this.isPinned(hash);
      if (!isPinnedBefore) {
        console.log(`L'hash ${hash} è già unpinnato`);
        return;
      }

      // Esegui l'unpin
      await this.serviceInstance.unpin([hash]);
      console.log(`Comando unpin eseguito per l'hash: ${hash}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('is not pinned')) {
        console.log(`L'hash ${hash} non è pinnato nel servizio`);
        return;
      }
      console.error('Errore durante unpin da Pinata:', error);
      throw error;
    }
  }

  public async uploadJson(jsonData: Record<string, unknown>, options?: PinataOptions): Promise<UploadOutput> {
    try {
      const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
      const file = new File([blob], 'data.json', { type: 'application/json' });
      
      const response = await this.serviceInstance.upload.file(file, {
        metadata: options?.pinataMetadata
      });
      
      return {
        id: response.IpfsHash,
        metadata: {
          timestamp: Date.now(),
          size: JSON.stringify(jsonData).length,
          type: 'json',
          ...response
        }
      };
    } catch (error) {
      console.error("Errore con Pinata:", error);
      throw error;
    }
  }

  public async uploadFile(path: string, options?: PinataOptions): Promise<UploadOutput> {
    try {
      const fileContent = await fs.promises.readFile(path);
      const file = new File([fileContent], path.split('/').pop() || 'file', {
        type: 'application/octet-stream'
      });
      
      const response = await this.serviceInstance.upload.file(file, {
        metadata: options?.pinataMetadata
      });
      
      return {
        id: response.IpfsHash,
        metadata: {
          timestamp: Date.now(),
          type: 'file',
          ...response
        }
      };
    } catch (error) {
      console.error("Errore con Pinata:", error);
      throw error;
    }
  }

  public async getMetadata(hash: string): Promise<any> {
    try {
      const response = await this.serviceInstance.query.files({
        hashContains: hash,
        limit: 1
      });
      if (response.items.length > 0) {
        return response.items[0];
      }
      return null;
    } catch (error) {
      console.error('Errore nel recupero dei metadata:', error);
      throw error;
    }
  }

  public async isPinned(hash: string): Promise<boolean> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      console.log(`Verifica pin per l'hash: ${hash}`);
      const response = await this.serviceInstance.query.files({
        hashContains: hash,
        limit: 1
      });
      const isPinned = response.items.length > 0;
      console.log(`Stato pin per l'hash ${hash}: ${isPinned ? 'pinnato' : 'non pinnato'}`);
      return isPinned;
    } catch (error) {
      console.error('Errore durante la verifica del pin:', error);
      return false;
    }
  }

  // Metodi non utilizzati ma richiesti dall'interfaccia
  public async uploadImage(path: string, options?: any): Promise<UploadOutput> {
    return this.uploadFile(path, options);
  }

  public async uploadVideo(path: string, options?: any): Promise<UploadOutput> {
    return this.uploadFile(path, options);
  }
}
