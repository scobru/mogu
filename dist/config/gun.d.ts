import Gun from "gun";
import "gun/sea";
interface GunOptions {
    file?: string;
    peers?: string[];
    web?: any;
}
export declare const initGun: (server: any, inputOptions?: GunOptions) => any;
export declare const initializeGun: (inputOptions?: GunOptions) => any;
export declare const getGunInstance: () => any;
export { Gun };
