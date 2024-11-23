import 'gun/sea';
import { NodeType, EncryptedNode as StandardNode } from './types';
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
    constructor(gunInstance?: any, peers?: string[], useIpfs?: boolean, encryptionKey?: string);
    authenticate(username: string, password: string): Promise<any>;
    private initializeSEA;
    private parseNodePath;
    private getGunReference;
    addNode(node: StandardNode): Promise<unknown>;
    getNode(id: string): Promise<StandardNode | null>;
    updateNode(node: StandardNode): Promise<unknown>;
    removeNode(id: string): Promise<unknown>;
    queryByType(type: NodeType, callback: (nodes: StandardNode[]) => void): Promise<void>;
    backupToIPFS(): Promise<unknown>;
    subscribeToChanges(callback: (node: GunNode) => void): void;
    getGunInstance(): any;
    plugin<T>(name: string): T | undefined;
    getGun(): any;
}
