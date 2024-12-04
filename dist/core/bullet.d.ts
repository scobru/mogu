import 'gun/gun';
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
interface BulletOptions {
    immutable?: boolean;
    key?: string;
    storageService?: Web3StashServices;
    storageConfig?: Web3StashConfig;
    server?: any;
    useIPFS?: boolean;
}
interface GunInstance {
    chain?: boolean;
    get: (prop: string) => any;
    put: (value: any, callback?: () => void) => any;
    once: (callback: (data: any) => void) => void;
}
interface RegisterContext {
    on: (event: string, callback: Function) => void;
    to: {
        next: (context: any) => void;
    };
}
interface UtilityInstance {
    name: keyof BulletUtilities;
    events?: {
        [key: string]: Function;
    };
}
interface BulletUtilities {
    [key: string]: UtilityInstance;
}
interface BulletWithDynamicProperties extends Bullet {
    [key: string]: any;
}
export declare class Bullet implements BulletWithDynamicProperties, BulletUtilities {
    [key: string]: any;
    private gun;
    private Gun;
    private _ctx;
    private _ctxVal;
    private _ready;
    private _proxyEnable;
    private _registerContext;
    private _ctxProp;
    immutable: boolean;
    private storageService?;
    private lastBackupHash?;
    private radataPath;
    private ipfsAdapter?;
    private useIPFS;
    constructor(gunOrOpts?: GunInstance | BulletOptions, opts?: BulletOptions);
    get value(): Promise<any>;
    get events(): RegisterContext;
    mutate(val?: any): void;
    extend(clss: Function | object | Array<Function | object>, opts?: any): void;
    private _registerInstanceHooks;
    getContext(): any;
    setContext(ctx: any): void;
    getProxyEnable(): boolean;
    setReady(value: boolean): void;
    setCtxProp(prop: any): void;
    setCtxVal(val: any): void;
    backup(): Promise<void>;
    restore(hash: string): Promise<void>;
    removeBackup(hash: string): Promise<void>;
    compareBackup(hash: string): Promise<void>;
    get(key: string): any;
    put(key: string, data: any): any;
    on(key: string, callback: (data: any) => void): void;
}
export {};
