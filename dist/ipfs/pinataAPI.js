"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePinMetadata = exports.getPinMetadata = exports.fetchFromIPFS = exports.unpinFromIPFS = exports.pinJSONToIPFS = exports.setCredentials = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let apiKey = process.env.PINATA_API_KEY || "";
let apiSecret = process.env.PINATA_API_SECRET || "";
let dbName = process.env.DB_NAME || "";
let apiGateway = process.env.PINATA_GATEWAY || "";
const setCredentials = (_apiKey, _apiSecret, _dbName, _apiGateway) => {
    apiKey = _apiKey;
    apiSecret = _apiSecret;
    dbName = _dbName;
    apiGateway = _apiGateway;
    console.log("Credentials set");
};
exports.setCredentials = setCredentials;
const pinJSONToIPFS = async (data) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    const content = typeof data === 'string' ?
        { data } :
        data;
    const requestBody = {
        pinataContent: content,
        pinataMetadata: {
            name: `${dbName}-${Date.now()}`,
            keyvalues: {
                type: 'gun-node',
                timestamp: Date.now().toString()
            }
        },
        pinataOptions: {
            cidVersion: 1
        }
    };
    try {
        const response = await axios_1.default.post(url, requestBody, {
            headers: {
                pinata_api_key: apiKey,
                pinata_secret_api_key: apiSecret,
            },
        });
        return response.data.IpfsHash;
    }
    catch (error) {
        console.error("Error pinning to IPFS:", error);
        throw error;
    }
};
exports.pinJSONToIPFS = pinJSONToIPFS;
const unpinFromIPFS = async (hashToUnpin) => {
    const url = `https://api.pinata.cloud/pinning/unpin/${hashToUnpin}`;
    try {
        await axios_1.default.delete(url, {
            headers: {
                pinata_api_key: apiKey,
                pinata_secret_api_key: apiSecret,
            },
        });
        return true;
    }
    catch (error) {
        console.error("Error unpinning from IPFS:", error);
        throw error;
    }
};
exports.unpinFromIPFS = unpinFromIPFS;
const fetchFromIPFS = async (cid) => {
    try {
        const url = `${apiGateway}/ipfs/${cid}`;
        let retries = 3;
        let lastError;
        while (retries > 0) {
            try {
                const response = await axios_1.default.get(url);
                if (response.status === 200) {
                    return response.data;
                }
            }
            catch (err) {
                lastError = err;
                retries--;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        const publicGateway = `https://ipfs.io/ipfs/${cid}`;
        const response = await axios_1.default.get(publicGateway);
        if (response.status === 200) {
            return response.data;
        }
        throw lastError || new Error('Failed to fetch from IPFS');
    }
    catch (err) {
        console.error(`Error fetching from IPFS: ${err}`);
        throw err;
    }
};
exports.fetchFromIPFS = fetchFromIPFS;
const getPinMetadata = async (cid) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS/${cid}`;
    try {
        const response = await axios_1.default.get(url, {
            headers: {
                pinata_api_key: apiKey,
                pinata_secret_api_key: apiSecret,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error("Error getting pin metadata:", error);
        throw error;
    }
};
exports.getPinMetadata = getPinMetadata;
const updatePinMetadata = async (cid, metadata) => {
    const url = `https://api.pinata.cloud/pinning/hashMetadata`;
    try {
        await axios_1.default.put(url, {
            ipfsPinHash: cid,
            keyvalues: metadata
        }, {
            headers: {
                pinata_api_key: apiKey,
                pinata_secret_api_key: apiSecret,
            },
        });
        return true;
    }
    catch (error) {
        console.error("Error updating pin metadata:", error);
        throw error;
    }
};
exports.updatePinMetadata = updatePinMetadata;
