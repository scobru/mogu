import { StorageService } from '../web3stash/services/base-storage';
import type { VersionInfo } from '../versioning';
import type { BackupMetadata, BackupData } from '../types/mogu';
import { Web3StashServices } from '../web3stash/types';
import { Web3Stash } from '../web3stash';

export interface BackupOptions {
  name?: string;
  description?: string;
  tags?: string[];
  type?: string;
  timestamp?: number;
  encryption?: {
    enabled: boolean;
    key: string;
    algorithm?: string;
  };
  metadata?: Record<string, any>;
}

export interface StorageServiceWithMetadata extends Omit<StorageService, 'get'> {
  get(hash: string): Promise<BackupData>;
  getMetadata?(hash: string): Promise<any>;
}

export abstract class BackupAdapter {
  protected storage: StorageServiceWithMetadata;

  constructor(
    storageService: Web3StashServices,
    storageConfig: any,
    protected options: BackupOptions = {}
  ) {
    const storage = Web3Stash(storageService, storageConfig);
    this.storage = {
      ...storage,
      get: async (hash: string) => {
        if (!storage.get) {
          throw new Error('Storage service does not support get operation');
        }
        const result = await storage.get(hash);
        if (!result?.data || !result?.metadata) {
          throw new Error('Invalid backup format');
        }
        return result;
      }
    } as StorageServiceWithMetadata;
  }

  protected generateBackupName(metadata: BackupMetadata): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .replace('Z', '');
    
    const type = metadata?.type || 'backup';
    const size = metadata?.versionInfo?.size || 0;
    
    // Formatta la dimensione
    const sizeFormatted = this.formatSize(size);
    
    // Aggiungi tag personalizzati se presenti
    const tags = this.options.tags ? `-${this.options.tags.join('-')}` : '';
    
    return `mogu-${type}-${sizeFormatted}${tags}-${timestamp}`;
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  protected serializeMetadata(metadata: any): Record<string, string | number | boolean> {
    const serialized: Record<string, string | number | boolean> = {};
    
    const serialize = (obj: any): string | number | boolean => {
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      return JSON.stringify(obj);
    };

    if (metadata && typeof metadata === 'object') {
      for (const [key, value] of Object.entries(metadata)) {
        serialized[key] = serialize(value);
      }
    }

    return serialized;
  }

  protected async createBackupMetadata(
    data: any,
    options?: BackupOptions,
    name?: string
  ): Promise<BackupMetadata> {
    const now = Date.now();
    return {
      timestamp: options?.timestamp || now,
      type: options?.type || 'backup',
      name: name || this.generateBackupName({ type: options?.type } as BackupMetadata),
      description: options?.description,
      metadata: options?.metadata,
      versionInfo: {
        hash: '',
        timestamp: now,
        size: Buffer.from(JSON.stringify(data)).length,
        metadata: {
          createdAt: new Date(now).toISOString(),
          modifiedAt: new Date(now).toISOString(),
          checksum: ''
        }
      }
    };
  }

  // Metodi pubblici che devono essere implementati dalle classi derivate
  abstract backup(sourcePath: string, options?: BackupOptions): Promise<{ 
    hash: string; 
    versionInfo: VersionInfo;
    name: string;
  }>;

  abstract restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;

  // Metodi comuni che possono essere usati da tutte le implementazioni
  async get(hash: string): Promise<BackupData> {
    if (!this.storage.get) {
      throw new Error('Storage service does not support get operation');
    }
    const result = await this.storage.get(hash);
    if (!result?.data || !result?.metadata) {
      throw new Error('Invalid backup format');
    }
    return result as BackupData;
  }

  async getMetadata(hash: string): Promise<BackupMetadata> {
    const backup = await this.get(hash);
    return backup.metadata;
  }

  async delete(hash: string): Promise<void> {
    if (!this.storage.unpin) {
      throw new Error('Storage service does not support delete operation');
    }
    return this.storage.unpin(hash);
  }
} 