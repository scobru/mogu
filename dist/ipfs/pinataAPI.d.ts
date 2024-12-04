export declare const setCredentials: (_apiKey: string, _apiSecret: string) => void;
export declare const pinJSONToIPFS: (JSONBody: any) => Promise<any>;
export declare const unpinFromIPFS: (hashToUnpin: string) => Promise<boolean>;
export declare const fetchFromIPFS: (cid: string) => Promise<any>;
