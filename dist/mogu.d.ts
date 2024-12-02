import { VersionInfo, VersionComparison, DetailedComparison } from './versioning';
import type { MoguConfig, BackupData } from './types/mogu';
import type { BackupOptions } from './types/backup';
declare module 'gun' {
    interface IGunInstance {
        backup(config: Required<MoguConfig>, customPath?: string, options?: BackupOptions): Promise<{
            hash: string;
            versionInfo: VersionInfo;
            name: string;
        }>;
        restore(config: Required<MoguConfig>, hash: string, customPath?: string, options?: BackupOptions): Promise<boolean>;
        compareBackup(config: Required<MoguConfig>, hash: string): Promise<VersionComparison>;
        compareDetailedBackup(config: Required<MoguConfig>, hash: string): Promise<DetailedComparison>;
        getBackupState(config: Required<MoguConfig>, hash: string): Promise<BackupData>;
    }
}
export declare class Mogu {
    private gun?;
    private fileBackup;
    private storage;
    config: Required<MoguConfig>;
    constructor(config: MoguConfig);
    get(key: string): any;
    put(key: string, data: any): any;
    on(key: string, callback: (data: any) => void): void;
    backupGun: (customPath?: string, options?: BackupOptions) => any;
    restoreGun: (hash: string, customPath?: string, options?: BackupOptions) => Promise<boolean>;
    backupFiles: (sourcePath: string, options?: import("./types/backup").BackupOptions) => Promise<import("./types/backup").BackupResult>;
    restoreFiles: (hash: string, targetPath: string, options?: import("./types/backup").BackupOptions) => Promise<boolean>;
    compareBackup: (hash: string, sourcePath?: string) => any;
    compareDetailedBackup: (hash: string, sourcePath?: string) => any;
    getBackupState: (hash: string) => any;
    backup: (customPath?: string, options?: BackupOptions) => any;
    restore: (hash: string, customPath?: string, options?: BackupOptions) => Promise<boolean>;
}
