export declare const startServer: () => Promise<{
    gunDb: any;
    server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
}>;
