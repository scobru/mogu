import { VersionInfo, VersionComparison, DetailedComparison } from './versioning';
import type { MoguConfig } from './types/mogu';
export declare class Mogu {
    private versionManager;
    private gun;
    private storage;
    private ipfsAdapter?;
    private config;
    constructor(config: MoguConfig);
    get(key: string): any;
    put(key: string, data: any): any;
    on(key: string, callback: (data: any) => void): void;
    backup(): Promise<{
        hash: string;
        versionInfo: VersionInfo;
    }>;
    restore(hash: string): Promise<boolean>;
    compareBackup(backupHash: string): Promise<VersionComparison>;
    compareDetailedBackup(backupHash: string): Promise<DetailedComparison>;
}
