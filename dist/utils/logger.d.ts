declare class Logger {
    private static instance;
    private logger;
    private constructor();
    static getInstance(): Logger;
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, error?: Error, meta?: any): void;
    startOperation(operation: string): string;
    endOperation(operationId: string, operation: string): void;
}
export declare const logger: Logger;
export {};
