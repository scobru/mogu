import { StorageService } from '../web3stash/services/base-storage';
import type { VersionInfo } from '../versioning';
import type { BackupMetadata } from '../types/mogu';
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
export interface BackupData {
    data: Record<string, any>;
    metadata: BackupMetadata;
}
export declare class BackupAdapter {
    private storage;
    private options;
    constructor(storage: StorageServiceWithMetadata, options?: BackupOptions);
    private generateBackupName;
    private formatSize;
    private serializeMetadata;
    createBackup(data: Record<string, any>, metadata: BackupMetadata): Promise<{
        hash: string;
        versionInfo: VersionInfo;
        name: string;
    }>;
    getBackup(hash: string): Promise<BackupData>;
    getBackupMetadata(hash: string): Promise<BackupMetadata>;
    deleteBackup(hash: string): Promise<void>;
}
