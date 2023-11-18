"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_ipfs_1 = __importDefault(require("@scobru/crypto-ipfs"));
const nostr_tools_1 = require("nostr-tools");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const secretKey = process.env.PRIVATE_KEY;
const publicKey = process.env.PUBLIC_KEY;
const moguUrl = "http://localhost:3001";
const dbKey = "nostrTestKey";
function generateNostrKeys() {
    const sk = (0, nostr_tools_1.generatePrivateKey)();
    const pk = (0, nostr_tools_1.getPublicKey)(sk);
    const kp = {
        npub: pk,
        nsec: sk,
    };
    console.log("Generated Nostr keys:", kp);
    return kp;
}
async function encryptData(kp) {
    // Convert hex secret key to buffer and check length
    const secretKeyBuffer = Buffer.from(secretKey, 'hex');
    if (secretKeyBuffer.length !== 32) {
        throw new Error('Secret key must be 32 bytes.');
    }
    // Convert to URL-safe base64
    const secretKeyBase64 = secretKeyBuffer.toString('base64');
    const encryptedData = crypto_ipfs_1.default.crypto.symmetric.encryptMessage(secretKeyBase64, JSON.stringify(kp));
    return encryptedData;
}
async function saveData(encryptedData) {
    const node = {
        "id": "0",
        "type": "FILE",
        "name": publicKey,
        "parent": "",
        "children": [],
        "content": encryptedData,
        "encrypted": false
    };
    const addUrl = moguUrl + '/api/addNode';
    axios_1.default.post(addUrl, JSON.parse(JSON.stringify(node)))
        .then(function (response) {
        console.log("Respose OK");
    })
        .catch(function (error) {
        console.log(error);
    });
    const storeUrl = moguUrl + '/api/save';
    let cid;
    try {
        const res = await axios_1.default.post(storeUrl, { key: dbKey });
        if (res.data && res.data.params) {
            cid = res.data.params;
            console.log("Received CID:", cid);
        }
        else {
            console.error("Invalid response format:", res.data);
        }
    }
    catch (error) {
        console.error("Error in API call:", error);
    }
    if (cid && cid.hash) {
        try {
            await fs_1.default.promises.writeFile('cid.json', JSON.stringify({ hash: cid.hash }));
            console.log('CID saved:', cid.hash);
        }
        catch (err) {
            console.error('Error writing to cid.json:', err);
        }
    }
    else {
        console.error('CID is undefined or empty, not writing to file');
    }
    return cid;
}
async function downloadAndDecryptData() {
    // Load CID from JSON file
    let cidData;
    try {
        cidData = fs_1.default.readFileSync('cid.json', 'utf8');
    }
    catch (err) {
        console.error('Error reading cid.json:', err);
        return;
    }
    if (!cidData) {
        console.error('cid.json is empty');
        return;
    }
    const cid = JSON.parse(cidData).hash;
    // Download data from IPFS using CID
    const getUrl = moguUrl + `/api/load/${cid}`;
    let encryptedData;
    try {
        const res = await axios_1.default.post(getUrl, { key: dbKey });
        encryptedData = res.data;
    }
    catch (error) {
        console.error('Error downloading data:', error);
        return;
    }
    console.log("Encrypted data:", encryptedData);
    // Decrypt data
    const secretKeyBuffer = Buffer.from(secretKey, 'hex');
    if (secretKeyBuffer.length !== 32) {
        throw new Error('Secret key must be 32 bytes.');
    }
    const secretKeyBase64 = secretKeyBuffer.toString('base64');
    const decryptedData = crypto_ipfs_1.default.crypto.symmetric.decryptMessage(secretKeyBase64, encryptedData.params[0].content);
    console.log("Decrypted data:", decryptedData);
    return decryptedData;
}
async function main() {
    const nostrKeys = generateNostrKeys();
    const encryptedData = await encryptData(JSON.stringify(nostrKeys)); // o ethPrivateKey
    await saveData(encryptedData);
    await downloadAndDecryptData();
}
main();
