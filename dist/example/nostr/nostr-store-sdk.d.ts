import { Mogu } from '../../sdk/sdk';
declare class NostrKeySDK {
    mogu: Mogu;
    cidFile: string;
    constructor(appKey: string, pinataApiKey: string, pinataApiSecret: string, dbName: string, cidFilePath: string);
    generateNostrKeys(): {
        npub: string;
        nsec: string;
    };
    encryptAndSaveData(nodeData: any): Promise<any>;
    retrieveAndDecryptData(): Promise<any>;
}
export default NostrKeySDK;
