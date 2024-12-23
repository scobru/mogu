import { ethers } from "ethers";
import { NodeType, EncryptedNode } from "../db/db";
type Query = (node: EncryptedNode) => boolean;
export declare class Mogu {
    private state;
    private key;
    constructor(key?: string, pinataApiKey?: string, pinataApiSecret?: string);
    initializeDatabase(): Map<string, EncryptedNode>;
    serialize(): Promise<string>;
    deserialize(json: string): Promise<EncryptedNode[]>;
    store(): Promise<any>;
    retrieve(hash: string): Promise<EncryptedNode[]>;
    load(hash: string): Promise<Map<string, EncryptedNode>>;
    addNode(node: EncryptedNode): Map<string, EncryptedNode>;
    removeNode(id: string): Map<string, EncryptedNode>;
    getNode(id: string): EncryptedNode | undefined;
    getAllNodes(): EncryptedNode[];
    getParent(id: string): EncryptedNode | null | undefined;
    updateNode(node: EncryptedNode): EncryptedNode;
    getChildren(id: string): (EncryptedNode | undefined)[];
    query(predicate: Query): EncryptedNode[];
    pin(): Promise<void>;
    unpin(hash: string): Promise<void>;
    queryByName(name: string): EncryptedNode[];
    queryByType(type: NodeType): EncryptedNode[];
    queryByContent(content: string): EncryptedNode[];
    queryByChildren(children: string[]): EncryptedNode[];
    queryByParent(parent: string): EncryptedNode[];
}
export declare class MoguOnChain extends Mogu {
    private contract;
    private abi;
    constructor(contractAddress: string, signer: ethers.Signer, initialState?: Map<string, EncryptedNode>, key?: string);
    registerCIDOnChain(): Promise<void>;
    getCurrentCIDFromChain(): Promise<string>;
}
export {};
