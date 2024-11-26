import { VersionInfo, VersionComparison, DetailedComparison } from './versioning';
import type { MoguConfig } from './types/mogu';
import { BackupOptions } from './adapters/backupAdapter';
export declare class Mogu {
    private versionManager;
    private gun;
    private storage;
    private ipfsAdapter?;
    private backupAdapter;
    private config;
    constructor(config: MoguConfig, backupOptions?: BackupOptions);
    get(key: string): any;
    put(key: string, data: any): any;
    on(key: string, callback: (data: any) => void): void;
    backup(): Promise<{
        hash: string;
        versionInfo: VersionInfo;
        name: string;
    }>;
    restore(hash: string): Promise<boolean>;
    compareBackup(backupHash: string): Promise<VersionComparison>;
    compareDetailedBackup(backupHash: string): Promise<DetailedComparison>;
}
