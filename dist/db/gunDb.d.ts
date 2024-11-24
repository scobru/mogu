import 'gun/sea';
import { EncryptedNode, NodeType, EncryptedNode as StandardNode } from './types';
export interface GunNode {
    id: string;
    type: NodeType;
    name: string;
    content?: any;
    encrypted?: boolean;
}
export declare class GunMogu {
    private gun;
    private user;
    private nodes;
    private ipfsAdapter?;
    private pair;
    private sea;
    private encryptionKey;
    private peers;
    constructor(gunInstance: any, encryptionKey?: string);
    addPeer(peerUrl: string): string[];
    removePeer(peerUrl: string): string[];
    getPeers(): string[];
    authenticate(username: string, password: string): Promise<any>;
    private tryAuthenticate;
    private initializeSEA;
    private parseNodePath;
    private getGunReference;
    private convertToStandardNode;
    private state;
    getState(): Map<string, EncryptedNode>;
    setState(newState: Map<string, EncryptedNode>): void;
    addNode(node: EncryptedNode): Promise<Map<string, EncryptedNode>>;
    private addNodeToGun;
    getNode(id: string): Promise<EncryptedNode | null>;
    private getNodeFromGun;
    updateNode(node: StandardNode): Promise<Map<string, EncryptedNode>>;
    removeNode(id: string): Promise<unknown>;
    queryByName(name: string): Promise<EncryptedNode[]>;
    queryByType(type: NodeType): Promise<EncryptedNode[]>;
    queryByContent(content: string): Promise<EncryptedNode[]>;
    subscribeToChanges(callback: (node: EncryptedNode) => void): void;
    getGunInstance(): any;
    getGun(): any;
}
