import { StorageService } from "./base-storage";
import type { UploadOutput } from "../types";
import type { PinataClient } from "@pinata/sdk";
import pinataSDK from "@pinata/sdk";
import axios from "axios";

interface PinataMetadata {
  name?: string;
  keyvalues?: Record<string, string | number | boolean | null>;
}

interface PinataOptions {
  pinataMetadata?: Record<string, any>;
  pinataOptions?: Record<string, any>;
}

export class PinataService extends StorageService {
  public serviceBaseUrl = "ipfs://";
  public readonly serviceInstance: PinataClient;

  constructor(pinataApiKey: string, pinataApiSecret: string) {
    super();
    this.serviceInstance = pinataSDK(pinataApiKey, pinataApiSecret);
  }

  public async get(hash: string) {
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

  public getEndpoint() {
    return "https://gateway.pinata.cloud/ipfs/";
  }

  public async unpin(hash: string) {
    await this.serviceInstance.unpin(hash);
  }

  private serializeMetadata(metadata: any): Record<string, string | number | boolean> {
    const serialized: Record<string, string | number | boolean> = {};
    
    // Funzione ricorsiva per serializzare oggetti complessi
    const serialize = (obj: any): string | number | boolean => {
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      return JSON.stringify(obj);
    };

    // Se metadata è un oggetto, serializza ogni valore
    if (metadata && typeof metadata === 'object') {
      for (const [key, value] of Object.entries(metadata)) {
        serialized[key] = serialize(value);
      }
    }

    return serialized;
  }

  private generateBackupName(metadata: any): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .replace('Z', '');
    
    const type = metadata?.type || 'backup';
    const version = metadata?.versionInfo?.version || '1.0';
    const size = metadata?.versionInfo?.size || 0;
    const sizeFormatted = this.formatSize(size);
    
    return `mogu-${type}-v${version}-${sizeFormatted}-${timestamp}`;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  public async uploadJson(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput> {
    try {
      const metadata = options?.metadata || {};
      const backupName = this.generateBackupName(metadata);
      
      const pinataOptions: PinataOptions = {
        pinataMetadata: {
          name: backupName,
          keyvalues: this.serializeMetadata({
            timestamp: new Date().toISOString(),
            type: "backup",
            version: "1.0",
            size: Buffer.from(JSON.stringify(jsonData)).length,
            ...metadata
          })
        },
      };

      const response = await this.serviceInstance.pinJSONToIPFS(jsonData, pinataOptions);
      
      return {
        id: response.IpfsHash,
        metadata: {
          ...response,
          name: backupName,
          data: jsonData,
          originalMetadata: metadata
        },
      };
    } catch (error) {
      console.error("Errore con Pinata:", error);
      throw error;
    }
  }

  public async getMetadata(hash: string): Promise<any> {
    try {
      const pinList = await this.serviceInstance.pinList({
        hashContains: hash
      });

      if (pinList.rows && pinList.rows.length > 0) {
        const pin = pinList.rows[0];
        const metadata = pin.metadata;
        
        // Tenta di deserializzare i valori JSON nei metadata
        if (metadata.keyvalues) {
          const deserializedMetadata: Record<string, any> = {};
          for (const [key, value] of Object.entries(metadata.keyvalues)) {
            try {
              deserializedMetadata[key] = JSON.parse(value as string);
            } catch {
              deserializedMetadata[key] = value;
            }
          }
          return deserializedMetadata;
        }
        
        return metadata;
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel recupero dei metadata:', error);
      throw error;
    }
  }

  public async uploadImage(path: string, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFromFS(path, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadVideo(path: string, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFromFS(path, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadFile(path: string, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFromFS(path, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadImageFromStream(readableStream: any, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadVideoFromStream(readableStream: any, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadFileFromStream(readableStream: any, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }
}
