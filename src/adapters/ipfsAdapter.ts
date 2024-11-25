import { IStorageAdapter } from './IStorageAdapter';
import { Web3Stash } from "../web3stash/index";
import type { Web3StashConfig } from "../web3stash/types";

export class IPFSAdapter implements IStorageAdapter {
  private storageService: any;
  private hashMap: Map<string, string> = new Map();
  to: any;

  constructor(config: Web3StashConfig) {
    this.storageService = Web3Stash('PINATA', config);
  }

  async put(key: string, data: any): Promise<void> {
    try {
      const result = await this.storageService.uploadJson(data);
      this.hashMap.set(key, result.id);
      console.log(`Data stored with key: ${key}, hash: ${result.id}`);
    } catch (error) {
      console.error(`Failed to store data for key: ${key}`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    const hash = this.hashMap.get(key);
    if (!hash) {
      throw new Error(`No hash found for key: ${key}`);
    }
    try {
      const data = await this.storageService.get(hash);
      console.log(`Data retrieved for key: ${key}, hash: ${hash}`);
      return data;
    } catch (error) {
      console.error(`Failed to retrieve data for key: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    const hash = this.hashMap.get(key);
    if (hash) {
      try {
        await this.storageService.unpin(hash);
        this.hashMap.delete(key);
        console.log(`Data removed for key: ${key}, hash: ${hash}`);
      } catch (error) {
        console.error(`Failed to remove data for key: ${key}`, error);
        throw error;
      }
    } else {
      console.warn(`No data found to remove for key: ${key}`);
    }
  }

  attachToGun(gun: any) {
    gun.on('put', async (request: any) => {
      this.to.next(request);

      const delta = request.put;
      const dedupId = request['#'];

      try {
        const result = await this.storageService.uploadJson(delta);
        this.hashMap.set(dedupId, result.id);

        gun.on('in', {
          '@': dedupId,
          ok: true
        });
      } catch (error) {
        console.error(`Failed to store data for request: ${dedupId}`, error);
        gun.on('in', {
          '@': dedupId,
          err: error
        });
      }
    });

    gun.on('get', async (request: any) => {
      this.to.next(request);

      const dedupId = request['#'];
      const hash = this.hashMap.get(dedupId);

      if (!hash) {
        gun.on('in', {
          '@': dedupId,
          err: `No hash found for request: ${dedupId}`
        });
        return;
      }

      try {
        const data = await this.storageService.get(hash);
        gun.on('in', {
          '@': dedupId,
          put: data
        });
      } catch (error) {
        console.error(`Failed to retrieve data for request: ${dedupId}`, error);
        gun.on('in', {
          '@': dedupId,
          err: error
        });
      }
    });
  }
} 