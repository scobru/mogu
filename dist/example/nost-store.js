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
function encryptData(kp) {
    const encryptedData = crypto_ipfs_1.default.crypto.symmetric.encryptMessage(JSON.stringify(kp), hexToUint8Array(String(secretKey)));
    console.log("Encrypted data:", encryptedData);
    return encryptedData;
}
async function saveData(encryptedData) {
    const node = {
        "id": "0",
        "type": "FILE",
        "name": publicKey,
        "parent": "",
        "children": [],
        "content": encryptedData
    };
    const addUrl = moguUrl + '/api/addNode';
    axios_1.default.post(addUrl, { node })
        .then(function (response) {
        console.log(response);
    })
        .catch(function (error) {
        console.log(error);
    });
    const storeUrl = moguUrl + '/api/store';
    let cid;
    try {
        const res = await axios_1.default.post(storeUrl, { node });
        console.log(res);
        cid = res.data.params;
    }
    catch (error) {
        console.log(error);
    }
    fs_1.default.writeFile('cid.json', cid, (err) => {
        if (err)
            throw err;
        console.log('cid saved');
    });
    console.log("CID:", cid);
    return cid;
}
function hexToUint8Array(hexString) {
    if (hexString.startsWith('0x')) {
        hexString = hexString.substring(2);
    }
    if (hexString.length % 2 !== 0) {
        throw new Error('Invalid hexString');
    }
    var bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
}
async function main() {
    const nostrKeys = generateNostrKeys();
    const encryptedData = encryptData(JSON.stringify(nostrKeys)); // o ethPrivateKey
    //const cid = await saveData(encryptedData);
    //console.log('Caricato su IPFS con CID:', cid);
}
main();
