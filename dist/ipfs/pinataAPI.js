"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFromIPFS = exports.unpinFromIPFS = exports.pinJSONToIPFS = exports.setCredentials = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let apiKey = process.env.PINATA_API_KEY || "";
let apiSecret = process.env.PINATA_API_SECRET || "";
const setCredentials = (_apiKey, _apiSecret) => {
    apiKey = _apiKey;
    apiSecret = _apiSecret;
    console.log("Credentials set");
};
exports.setCredentials = setCredentials;
const pinJSONToIPFS = async (JSONBody) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    // Preparazione del corpo della richiesta
    const requestBody = {
        pinataContent: JSONBody,
        pinataMetadata: {
            name: process.env.DB_NAME
        }
    };
    return await axios_1.default
        .post(url, requestBody, {
        headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
        },
    })
        .then(response => {
        return response.data.IpfsHash;
    })
        .catch(error => {
        console.error("Error pinning JSON to IPFS: ", error);
        return null;
    });
};
exports.pinJSONToIPFS = pinJSONToIPFS;
const unpinFromIPFS = async (hashToUnpin) => {
    const url = `https://api.pinata.cloud/pinning/unpin/${hashToUnpin}`;
    return await axios_1.default
        .delete(url, {
        headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
        },
    })
        .then(response => {
        return true;
    })
        .catch(error => {
        console.error("Error unpinning from IPFS: ", error);
        return false;
    });
};
exports.unpinFromIPFS = unpinFromIPFS;
const fetchFromIPFS = async (cid) => {
    try {
        const url = `https://sapphire-financial-fish-885.mypinata.cloud/ipfs/${cid}`;
        const response = await axios_1.default.get(url);
        if (response.status === 200) {
            return response.data;
        }
        else {
            throw new Error("Failed to fetch from IPFS via Pinata");
        }
    }
    catch (err) {
        console.error(`Error fetching from IPFS via Pinata: ${err}`);
        throw err;
    }
};
exports.fetchFromIPFS = fetchFromIPFS;
