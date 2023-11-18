"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nostr_tools_1 = require("nostr-tools");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const privateKey = "YOUR_PRIVATE_KEY_HERE";
const publicKey = "YOUR_PUBLIC_KEY_HERE";
const moguUrl = "http://localhost:3001";
function generateNostrKeys() {
    const sk = (0, nostr_tools_1.generatePrivateKey)();
    const pk = (0, nostr_tools_1.getPublicKey)(sk);
    const kp = {
        npub: pk,
        nsec: sk,
    };
    console.log("Generated Nostr keys:", kp);
    return JSON.stringify(kp);
}
async function saveData(nodeData) {
    const node = {
        id: "0",
        type: "FILE",
        name: publicKey,
        parent: "",
        children: [],
        content: nodeData,
        encrypted: false,
    };
    const addUrl = moguUrl + "/api/addNode";
    axios_1.default
        .post(addUrl, JSON.parse(JSON.stringify(node)))
        .then(function (response) {
        console.log("Respose OK");
    })
        .catch(function (error) {
        console.log(error);
    });
    const storeUrl = moguUrl + "/api/save";
    let cid;
    try {
        const res = await axios_1.default.post(storeUrl, { key: privateKey });
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
            await fs_1.default.promises.writeFile("nostr-cid-api.json", JSON.stringify({ hash: cid.hash }));
            console.log("CID saved:", cid.hash);
        }
        catch (err) {
            console.error("Error writing to nostr-cid-api.json:", err);
        }
    }
    else {
        console.error("CID is undefined or empty, not writing to file");
    }
    return cid;
}
async function downloadAndDecryptData() {
    // Load CID from JSON file
    let cidData;
    try {
        cidData = fs_1.default.readFileSync("nostr-cid-api.json", "utf8");
    }
    catch (err) {
        console.error("Error reading nostr-cid-api.json:", err);
        return;
    }
    if (!cidData) {
        console.error("nostr-cid-api.json is empty");
        return;
    }
    const cid = JSON.parse(cidData).hash;
    // Download data from IPFS using CID
    const getUrl = moguUrl + `/api/load/${cid}`;
    let decryptedData;
    try {
        const res = await axios_1.default.post(getUrl, { key: privateKey });
        decryptedData = res.data;
    }
    catch (error) {
        console.error("Error downloading data:", error);
        return;
    }
    console.log("Encrypted data:", decryptedData.params[0].content);
    return decryptedData.params[0].content;
}
async function main() {
    const nostrKeys = generateNostrKeys();
    await saveData(nostrKeys);
    await downloadAndDecryptData();
}
main();
