import type { StorageService } from '../web3stash/services/base-storage';
import type { VersionInfo } from '../versioning';
import type { BackupData as MoguBackupData } from './mogu';
import type { UploadOutput } from '../web3stash/types';
export interface BackupOptions {
    encryption?: {
        enabled: boolean;
        key: string;
        algorithm?: string;
    };
    excludePatterns?: string[];
    maxFileSize?: number;
    type?: string;
    description?: string;
    metadata?: Record<string, any>;
    timestamp?: number;
    tags?: string[];
}
export interface BackupResult {
    hash: string;
    versionInfo: VersionInfo;
    name?: string;
}
export interface BackupMetadata {
    timestamp: number;
    type: string;
    name?: string;
    description?: string;
    metadata?: Record<string, any>;
    versionInfo: VersionInfo;
    sourcePath?: string;
    isEncrypted?: boolean;
    [key: string]: any;
}
export interface FileData {
    type?: 'binary' | 'text';
    content?: string;
    isEncrypted?: boolean;
    encrypted?: string;
    iv?: string;
    mimeType?: string;
}
export interface BackupData extends MoguBackupData {
    data: Record<string, FileData>;
}
export interface StorageServiceWithMetadata extends Partial<StorageService> {
    get(hash: string): Promise<MoguBackupData>;
    uploadJson?(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput>;
}
export interface IBackupAdapter {
    backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult>;
    restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    get(hash: string): Promise<BackupData>;
    delete(hash: string): Promise<boolean>;
}
