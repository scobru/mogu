import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { NodeType, EncryptedNode } from "../db/types";
export { EncryptedNode, NodeType };
interface MoguOptions {
    key?: string;
    storageService?: Web3StashServices;
    storageConfig?: Web3StashConfig;
    server?: any;
}
/**
 * Mogu - A decentralized database with IPFS backup capabilities
 * @class
 */
export declare class Mogu {
    private gun;
    private storageService?;
    private lastBackupHash?;
    private radataPath;
    constructor(options?: MoguOptions);
    login(username: string, password: string): Promise<any>;
    put(path: string, data: any): Promise<unknown>;
    get(path: string): Promise<any>;
    on(path: string, callback: (data: any) => void): void;
    backup(): Promise<any>;
    restore(hash: string): Promise<boolean>;
    removeBackup(hash: string): Promise<void>;
    getGun(): any;
    getState(): Map<string, EncryptedNode>;
    private getFileHash;
    compareBackup(hash: string): Promise<{
        isEqual: boolean;
        differences?: {
            missingLocally: string[];
            missingRemotely: string[];
            contentMismatch: string[];
        };
    }>;
}
