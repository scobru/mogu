import { z } from 'zod';
export declare const configSchema: z.ZodObject<{
    storage: z.ZodObject<{
        service: z.ZodEnum<["PINATA", "IPFS-CLIENT"]>;
        config: z.ZodObject<{
            pinataJwt: z.ZodString;
            pinataGateway: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            pinataJwt: string;
            pinataGateway?: string | undefined;
        }, {
            pinataJwt: string;
            pinataGateway?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        service: "PINATA" | "IPFS-CLIENT";
        config: {
            pinataJwt: string;
            pinataGateway?: string | undefined;
        };
    }, {
        service: "PINATA" | "IPFS-CLIENT";
        config: {
            pinataJwt: string;
            pinataGateway?: string | undefined;
        };
    }>;
    paths: z.ZodObject<{
        backup: z.ZodOptional<z.ZodString>;
        restore: z.ZodOptional<z.ZodString>;
        storage: z.ZodOptional<z.ZodString>;
        logs: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        backup?: string | undefined;
        logs?: string | undefined;
        storage?: string | undefined;
        restore?: string | undefined;
    }, {
        backup?: string | undefined;
        logs?: string | undefined;
        storage?: string | undefined;
        restore?: string | undefined;
    }>;
    features: z.ZodObject<{
        useIPFS: z.ZodBoolean;
        encryption: z.ZodObject<{
            enabled: z.ZodBoolean;
            algorithm: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            algorithm: string;
        }, {
            enabled: boolean;
            algorithm: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        encryption: {
            enabled: boolean;
            algorithm: string;
        };
        useIPFS: boolean;
    }, {
        encryption: {
            enabled: boolean;
            algorithm: string;
        };
        useIPFS: boolean;
    }>;
    performance: z.ZodObject<{
        maxConcurrent: z.ZodNumber;
        chunkSize: z.ZodNumber;
        cacheEnabled: z.ZodBoolean;
        cacheSize: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    }, {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    }>;
}, "strip", z.ZodTypeAny, {
    storage: {
        service: "PINATA" | "IPFS-CLIENT";
        config: {
            pinataJwt: string;
            pinataGateway?: string | undefined;
        };
    };
    paths: {
        backup?: string | undefined;
        logs?: string | undefined;
        storage?: string | undefined;
        restore?: string | undefined;
    };
    features: {
        encryption: {
            enabled: boolean;
            algorithm: string;
        };
        useIPFS: boolean;
    };
    performance: {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    };
}, {
    storage: {
        service: "PINATA" | "IPFS-CLIENT";
        config: {
            pinataJwt: string;
            pinataGateway?: string | undefined;
        };
    };
    paths: {
        backup?: string | undefined;
        logs?: string | undefined;
        storage?: string | undefined;
        restore?: string | undefined;
    };
    features: {
        encryption: {
            enabled: boolean;
            algorithm: string;
        };
        useIPFS: boolean;
    };
    performance: {
        maxConcurrent: number;
        chunkSize: number;
        cacheEnabled: boolean;
        cacheSize: number;
    };
}>;
export type Config = z.infer<typeof configSchema>;
export declare const defaultConfig: Config;
