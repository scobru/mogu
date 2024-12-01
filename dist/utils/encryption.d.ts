export declare class Encryption {
    private algorithm;
    private key;
    constructor(key: string, algorithm?: string);
    encrypt(data: string | Buffer): {
        encrypted: Buffer;
        iv: Buffer;
    };
    decrypt(encrypted: Buffer, iv: Buffer): Buffer;
}
