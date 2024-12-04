export declare enum NodeType {
    NODE = "NODE"
}
export interface EncryptedNode {
    id: string;
    type: NodeType;
    name: string;
    content?: any;
    encrypted?: boolean;
}
