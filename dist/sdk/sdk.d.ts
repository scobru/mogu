import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { ethers } from "ethers";
import { NodeType, EncryptedNode } from "../db/types";
type Query = (node: EncryptedNode) => boolean;
export { EncryptedNode, NodeType };
export declare class Mogu {
    private gunDb;
    private key;
    private dbName;
    private state;
    private storageService?;
    constructor(peers?: string[], key?: string, storageService?: Web3StashServices, storageConfig?: Web3StashConfig, dbName?: string);
    login(username: string, password: string): Promise<any>;
    onNodeChange(callback: (node: EncryptedNode) => void): void;
    addNode(node: EncryptedNode): Promise<Map<string, EncryptedNode>>;
    getNode(id: string): Promise<EncryptedNode | null>;
    initializeDatabase(): Map<string, EncryptedNode>;
    serialize(): Promise<string>;
    deserialize(json: string): Promise<EncryptedNode[]>;
    store(): Promise<any>;
    isEncryptedNode(value: any): value is EncryptedNode;
    processKey(hashedKey: string): string;
    retrieve(hash: string): Promise<EncryptedNode[]>;
    load(hash: string): Promise<Map<string, EncryptedNode>>;
    removeNode(id: string): Map<string, EncryptedNode>;
    getAllNodes(): EncryptedNode[];
    updateNode(node: EncryptedNode): EncryptedNode | undefined;
    query(predicate: Query): EncryptedNode[];
    pin(): Promise<void>;
    unpin(hash: string): Promise<void>;
    queryByName(name: string): EncryptedNode[];
    queryByType(type: NodeType): EncryptedNode[];
    queryByContent(content: string): EncryptedNode[];
    getGun(): any;
    useChainPlugin(): Promise<void>;
    chainOperation(path: string): Promise<EncryptedNode>;
    plugin<T>(name: string): T | undefined;
    gun(): any;
}
export declare class MoguOnChain extends Mogu {
    private contract;
    private abi;
    constructor(contractAddress: string, signer: ethers.Signer, peers?: string[], initialState?: Map<string, EncryptedNode>, key?: string);
    registerCIDOnChain(): Promise<void>;
    getCurrentCIDFromChain(): Promise<string>;
}
