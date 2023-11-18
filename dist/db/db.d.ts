export type NodeType = "FILE" | "DIRECTORY";
export type EncryptedNode = {
    id: string;
    type: NodeType;
    name: string;
    parent?: string;
    children?: string[];
    content?: any;
    encrypted?: boolean;
};
type Query = (node: EncryptedNode) => boolean;
/**
 * Serialize the database
 * @param {Map<string, EncryptedNode>} state - The state of the database
 * @param {Uint8Array} key - The key used to encrypt the database
 * @returns
 */
export declare const serializeDatabase: (state: Map<string, EncryptedNode>, key: Uint8Array) => Promise<string>;
/**
 * Deserialize the database
 * @param {string} json - The serialized database
 * @param {Uint8Array} key - The key used to decrypt the database
 * @returns
 */
export declare const deserializeDatabase: (json: string, key: Uint8Array) => Promise<EncryptedNode[]>;
export declare const storeDatabase: (state: Map<string, EncryptedNode>, key: Uint8Array) => Promise<any>;
export declare const retrieveDatabase: (hash: string, key: Uint8Array) => Promise<EncryptedNode[]>;
export declare const addNode: (state: Map<string, EncryptedNode>, node: EncryptedNode) => Map<string, EncryptedNode>;
export declare const removeNode: (state: Map<string, EncryptedNode>, id: string) => Map<string, EncryptedNode>;
export declare const getNode: (state: Map<string, EncryptedNode>, id: string) => EncryptedNode | undefined;
export declare const getAllNodes: (state: Map<string, EncryptedNode>) => EncryptedNode[];
export declare const getParent: (state: Map<string, EncryptedNode>, id: string) => EncryptedNode | null | undefined;
export declare const updateNode: (state: Map<string, EncryptedNode>, updatedNode: EncryptedNode) => Map<string, EncryptedNode>;
export declare const getChildren: (state: Map<string, EncryptedNode>, id: string) => (EncryptedNode | undefined)[];
export declare const query: (state: Map<string, EncryptedNode>, predicate: Query) => EncryptedNode[];
export declare const storeOnChain: (state: Map<string, EncryptedNode>, key: Uint8Array, contract: any) => Promise<any>;
export declare const getCidOnChain: (contract: any) => Promise<string>;
export {};
