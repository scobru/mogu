import { StorageService } from '../web3stash/services/base-storage';
import type { VersionInfo } from '../versioning';
import type { BackupMetadata, BackupData } from '../types/mogu';
import { UploadOutput, Web3StashServices } from '../web3stash/types';
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
export declare abstract class BackupAdapter {
    protected options: BackupOptions;
    protected storage: StorageServiceWithMetadata;
    constructor(storageService: Web3StashServices, storageConfig: any, options?: BackupOptions);
    protected generateBackupName(metadata: BackupMetadata): string;
    protected formatSize(bytes: number): string;
    protected serializeMetadata(metadata: any): Record<string, string | number | boolean>;
    protected createBackupMetadata(data: any, options?: BackupOptions, name?: string): Promise<BackupMetadata>;
    abstract backup(sourcePath: string, options?: BackupOptions): Promise<{
        hash: string;
        versionInfo: VersionInfo;
        name: string;
    }>;
    abstract restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    get(hash: string): Promise<BackupData>;
    getMetadata(hash: string): Promise<BackupMetadata>;
    abstract delete(hash: string): Promise<boolean>;
    abstract upload(data: any, options?: BackupOptions): Promise<UploadOutput>;
}
