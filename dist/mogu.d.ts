import { VersionInfo, VersionComparison, DetailedComparison } from './versioning';
import type { MoguConfig, BackupData } from './types/mogu';
import { BackupOptions } from './adapters/backupAdapter';
export declare class Mogu {
    private versionManager;
    gun: any;
    private storage;
    private ipfsAdapter?;
    private backupAdapter;
    private backupPath;
    config: Required<MoguConfig>;
    constructor(config: MoguConfig, backupOptions?: BackupOptions);
    get(key: string): any;
    put(key: string, data: any): any;
    on(key: string, callback: (data: any) => void): void;
    backup(customBackupPath?: string): Promise<{
        hash: string;
        versionInfo: VersionInfo;
        name: string;
    }>;
    restore(hash: string, customRestorePath?: string): Promise<boolean>;
    compareBackup(backupHash: string): Promise<VersionComparison>;
    compareDetailedBackup(backupHash: string): Promise<DetailedComparison>;
    getBackupState(hash: string): Promise<BackupData>;
    private isBinaryFile;
    private getMimeType;
}
