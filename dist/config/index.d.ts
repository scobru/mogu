import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    storage: z.ZodObject<{
        service: z.ZodEnum<["PINATA", "BUNDLR", "NFT.STORAGE", "WEB3.STORAGE", "ARWEAVE", "IPFS-CLIENT", "LIGHTHOUSE"]>;
        config: z.ZodObject<{
            apiKey: z.ZodString;
            apiSecret: z.ZodString;
            endpoint: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        }, {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        service: "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
        config: {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        };
    }, {
        service: "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
        config: {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        };
    }>;
    paths: z.ZodObject<{
        radata: z.ZodString;
        backup: z.ZodString;
        restore: z.ZodString;
        storage: z.ZodString;
        logs: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        storage: string;
        radata: string;
        backup: string;
        restore: string;
        logs: string;
    }, {
        storage: string;
        radata: string;
        backup: string;
        restore: string;
        logs: string;
    }>;
    features: z.ZodObject<{
        useIPFS: z.ZodBoolean;
        useGun: z.ZodBoolean;
        encryption: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodBoolean;
            algorithm: z.ZodDefault<z.ZodEnum<["aes-256-gcm"]>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            algorithm: "aes-256-gcm";
        }, {
            enabled: boolean;
            algorithm?: "aes-256-gcm" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        encryption: {
            enabled: boolean;
            algorithm: "aes-256-gcm";
        };
        useIPFS: boolean;
        useGun: boolean;
    }, {
        useIPFS: boolean;
        useGun: boolean;
        encryption?: {
            enabled: boolean;
            algorithm?: "aes-256-gcm" | undefined;
        } | undefined;
    }>;
    performance: z.ZodDefault<z.ZodObject<{
        maxConcurrent: z.ZodDefault<z.ZodNumber>;
        chunkSize: z.ZodDefault<z.ZodNumber>;
        cacheEnabled: z.ZodDefault<z.ZodBoolean>;
        cacheSize: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    }, {
        maxConcurrent?: number | undefined;
        chunkSize?: number | undefined;
        cacheEnabled?: boolean | undefined;
        cacheSize?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    storage: {
        service: "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
        config: {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        };
    };
    paths: {
        storage: string;
        radata: string;
        backup: string;
        restore: string;
        logs: string;
    };
    features: {
        encryption: {
            enabled: boolean;
            algorithm: "aes-256-gcm";
        };
        useIPFS: boolean;
        useGun: boolean;
    };
    performance: {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    };
}, {
    storage: {
        service: "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
        config: {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        };
    };
    paths: {
        storage: string;
        radata: string;
        backup: string;
        restore: string;
        logs: string;
    };
    features: {
        useIPFS: boolean;
        useGun: boolean;
        encryption?: {
            enabled: boolean;
            algorithm?: "aes-256-gcm" | undefined;
        } | undefined;
    };
    performance?: {
        maxConcurrent?: number | undefined;
        chunkSize?: number | undefined;
        cacheEnabled?: boolean | undefined;
        cacheSize?: number | undefined;
    } | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
export declare const config: {
    storage: {
        service: "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
        config: {
            apiKey: string;
            apiSecret: string;
            endpoint?: string | undefined;
        };
    };
    paths: {
        storage: string;
        radata: string;
        backup: string;
        restore: string;
        logs: string;
    };
    features: {
        encryption: {
            enabled: boolean;
            algorithm: "aes-256-gcm";
        };
        useIPFS: boolean;
        useGun: boolean;
    };
    performance: {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    };
};
export {};
