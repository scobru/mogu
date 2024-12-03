import type { VersionInfo, VersionComparison, DetailedComparison } from '../versioning';
import type { BackupData } from './mogu';
export interface BackupOptions {
    includeBinaryFiles?: boolean;
    excludePatterns?: string[];
    maxFileSize?: number;
    recursive?: boolean;
    encryption?: {
        enabled: boolean;
        key: string;
        algorithm?: string;
    };
}
export interface BackupResult {
    hash: string;
    versionInfo?: VersionInfo;
    name?: string;
}
export interface IBackupAdapter {
    backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult>;
    restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    get(hash: string): Promise<BackupData>;
    compare(hash: string, sourcePath: string): Promise<VersionComparison>;
    compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison>;
}
