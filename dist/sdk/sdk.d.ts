import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { ethers } from "ethers";
import { NodeType, EncryptedNode } from "../db/types";
export { EncryptedNode, NodeType };
interface MoguOptions {
    key?: string;
    storageService?: Web3StashServices;
    storageConfig?: Web3StashConfig;
    dbName?: string;
    server?: any;
}
export declare class Mogu {
    private gunDb;
    private key;
    private dbName;
    private storageService?;
    constructor(options?: MoguOptions);
    addPeer(peerUrl: string): string[];
    removePeer(peerUrl: string): string[];
    getPeers(): string[];
    login(username: string, password: string): Promise<any>;
    onNodeChange(callback: (node: EncryptedNode) => void): void;
    addNode(node: EncryptedNode): Promise<Map<string, EncryptedNode>>;
    getNode(id: string): Promise<EncryptedNode | null>;
    queryByName(name: string): Promise<EncryptedNode[]>;
    queryByType(type: NodeType): Promise<EncryptedNode[]>;
    queryByContent(content: string): Promise<EncryptedNode[]>;
    store(): Promise<any>;
    processKey(hashedKey: string): string;
    load(hash: string): Promise<Map<string, EncryptedNode>>;
    removeNode(id: string): Promise<unknown>;
    getAllNodes(): EncryptedNode[];
    updateNode(node: EncryptedNode): Promise<Map<string, EncryptedNode>>;
    pin(): Promise<void>;
    unpin(hash: string): Promise<void>;
    getGun(): any;
}
export declare class MoguOnChain extends Mogu {
    private contract;
    private abi;
    constructor(contractAddress: string, signer: ethers.Signer, options?: MoguOptions);
    registerCIDOnChain(): Promise<void>;
    getCurrentCIDFromChain(): Promise<string>;
}
