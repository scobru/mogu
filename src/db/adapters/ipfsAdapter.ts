import { IStorageAdapter } from './IStorageAdapter';
import { Web3Stash } from "../../web3stash/index";
import type { Web3StashServices, Web3StashConfig } from "../../web3stash/types";

export class IPFSAdapter implements IStorageAdapter {
  private storageService: any;
  private hashMap: Map<string, string> = new Map();

  constructor(
    gun: any,
    config: Web3StashConfig = {
      apiKey: process.env.PINATA_API_KEY || '',
      apiSecret: process.env.PINATA_API_SECRET || ''
    }
  ) {
    this.storageService = Web3Stash('PINATA', config);
  }

  async put(key: string, data: any): Promise<void> {
    const result = await this.storageService.uploadJson(data);
    this.hashMap.set(key, result.id);
  }

  async get(key: string): Promise<any> {
    const hash = this.hashMap.get(key);
    if (!hash) {
      throw new Error(`No hash found for key: ${key}`);
    }
    // Per ora lanciamo un errore poiché il recupero non è implementato
    throw new Error("Get method not implemented yet");
  }

  async remove(key: string): Promise<void> {
    const hash = this.hashMap.get(key);
    if (hash) {
      await this.storageService.unpin(hash);
      this.hashMap.delete(key);
    }
  }
} 