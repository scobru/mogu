import { IStorageAdapter } from './IStorageAdapter';
import type { Web3StashConfig } from "../web3stash/types";
export declare class IPFSAdapter implements IStorageAdapter {
    private storageService;
    private hashMap;
    to: any;
    constructor(config: Web3StashConfig);
    put(key: string, data: any): Promise<void>;
    get(key: string): Promise<any>;
    remove(key: string): Promise<void>;
    attachToGun(gun: any): void;
}
