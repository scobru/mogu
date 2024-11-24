export declare enum NodeType {
    AUTH = "AUTH",
    MESSAGE = "MESSAGE",
    NODE = "NODE"
}
export interface EncryptedNode {
    id: string;
    type: NodeType;
    name: string;
    content?: any;
    encrypted?: boolean;
}
