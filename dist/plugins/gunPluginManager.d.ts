declare global {
    interface IGun {
        chain: any;
    }
}
export interface GunPlugin {
    name: string;
    chainMethods?: Record<string, Function>;
    staticMethods?: Record<string, Function>;
    init?: (gun: any) => void;
}
export declare class GunPluginManager {
    private static plugins;
    static register(plugin: GunPlugin): void;
    static initializePlugins(gunInstance: any): void;
    static getPlugin(name: string): GunPlugin | undefined;
}
