export declare const setCredentials: (_apiKey: string, _apiSecret: string, _dbName: string, _apiGateway: string) => void;
export declare const pinJSONToIPFS: (data: any) => Promise<any>;
export declare const unpinFromIPFS: (hashToUnpin: string) => Promise<boolean>;
export declare const fetchFromIPFS: (cid: string) => Promise<any>;
export declare const getPinMetadata: (cid: string) => Promise<any>;
export declare const updatePinMetadata: (cid: string, metadata: any) => Promise<boolean>;
