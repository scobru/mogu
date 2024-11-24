import { GunMogu } from './db/gunDb';
export declare const startServer: () => Promise<{
    gunDb: GunMogu;
    server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
}>;
