import { StorageService } from '../web3stash/services/base-storage';
import type { VersionInfo } from '../versioning';
import type { BackupMetadata, BackupData } from '../types/mogu';

export interface BackupOptions {
  name?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface StorageServiceWithMetadata extends StorageService {
  get(hash: string): Promise<any>;
  getMetadata?(hash: string): Promise<any>;
}

export class BackupAdapter {
  constructor(
    private storage: StorageServiceWithMetadata,
    private options: BackupOptions = {}
  ) {}

  private generateBackupName(metadata: BackupMetadata): string {
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

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  private serializeMetadata(metadata: any): Record<string, string | number | boolean> {
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

  async createBackup(data: Record<string, any>, metadata: BackupMetadata): Promise<{ 
    hash: string; 
    versionInfo: VersionInfo;
    name: string;
  }> {
    const backupName = this.generateBackupName(metadata);
    
    // Crea l'oggetto backup che include sia i dati che i metadata
    const backupData = {
      data,
      metadata: {
        ...metadata,
        name: backupName,
        description: this.options.description,
        timestamp: Date.now()
      }
    } as Record<string, unknown>;

    const storageMetadata = {
      name: backupName,
      description: this.options.description || 'Mogu backup',
      keyvalues: this.serializeMetadata({
        ...this.options.metadata,
        backupName,
        description: this.options.description,
        versionInfo: metadata.versionInfo,
        size: Buffer.from(JSON.stringify(data)).length
      })
    };

    const result = await this.storage.uploadJson(backupData, { 
      pinataMetadata: storageMetadata 
    });

    return {
      hash: result.id,
      versionInfo: metadata.versionInfo,
      name: backupName
    };
  }

  async getBackup(hash: string): Promise<BackupData> {
    if (!this.storage.get) {
      throw new Error('Storage service does not support get operation');
    }
    const result = await this.storage.get(hash);
    if (!result?.data || !result?.metadata) {
      throw new Error('Invalid backup format');
    }
    return result as BackupData;
  }

  async getBackupMetadata(hash: string): Promise<BackupMetadata> {
    const backup = await this.getBackup(hash);
    return backup.metadata;
  }

  async deleteBackup(hash: string): Promise<void> {
    return this.storage.unpin?.(hash);
  }
} 