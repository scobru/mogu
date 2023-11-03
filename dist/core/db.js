"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCidOnChain = exports.storeOnChain = exports.query = exports.getChildren = exports.updateNode = exports.getParent = exports.getAllNodes = exports.getNode = exports.removeNode = exports.addNode = exports.retrieveDatabase = exports.storeDatabase = exports.deserializeDatabaseSdk = exports.deserializeDatabase = exports.serializeDatabase = void 0;
const pinataAPI_1 = require("../ipfs/pinataAPI");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_ipfs_1 = __importDefault(require("@scobru/crypto-ipfs"));
const ethers_1 = require("ethers");
const serializeDatabase = (state, key) => {
    console.log("Serializing DB...");
    const nodes = Array.from(state.values());
    const nonce = crypto_ipfs_1.default.crypto.asymmetric.generateNonce();
    const noncePath = (0, path_1.join)(__dirname, "nonces.json");
    (0, fs_1.writeFileSync)(noncePath, JSON.stringify({ nonce: Buffer.from(nonce).toString("hex") }));
    const encryptedNodes = nodes.map(node => (Object.assign(Object.assign({}, node), { content: node.content
            ? crypto_ipfs_1.default.crypto.asymmetric.secretBox.encryptMessage(node.content, nonce, key)
            : undefined, encrypted: true })));
    const json = JSON.stringify(encryptedNodes);
    return json;
};
exports.serializeDatabase = serializeDatabase;
function objectToUint8Array(obj) {
    const arr = Object.values(obj);
    return new Uint8Array(arr);
}
const deserializeDatabase = async (json, key) => {
    console.log("Deserializing DB...");
    const noncePath = (0, path_1.join)(__dirname, "nonces.json");
    const storedNonce = JSON.parse((0, fs_1.readFileSync)(noncePath, "utf-8"));
    const nonce = Buffer.from(storedNonce.nonce, "hex");
    const encryptedNodes = JSON.parse(json);
    const nodes = await Promise.all(encryptedNodes.map(async (node) => {
        let content = node.content;
        if (node.encrypted) {
            if (content && typeof content === "object" && !Array.isArray(content)) {
                content = objectToUint8Array(content);
            }
            if (content === undefined) {
                console.error("Content is undefined for node:", node);
                content = new Uint8Array();
            }
            else {
                console.log("Decrypting content");
                console.log("Nonce:", nonce);
                console.log("Key:", key);
                console.log("Content:", content);
                content = await crypto_ipfs_1.default.crypto.asymmetric.secretBox.decryptMessage(content, nonce, key);
            }
        }
        return Object.assign(Object.assign({}, node), { content });
    }));
    const state = new Map();
    if (nodes) {
        nodes.forEach((node) => {
            if (node) {
                state.set(node.id, node);
            }
            else {
                console.log("Undefined node found");
            }
        });
        return state;
    }
    else {
        console.log("No nodes found");
    }
};
exports.deserializeDatabase = deserializeDatabase;
const deserializeDatabaseSdk = async (json, key, nonce) => {
    console.log("Deserializing DB in SDK...");
    const nonceBuffer = Buffer.from(nonce, "hex");
    const nonceBuffer2 = new Uint8Array(nonceBuffer);
    const encryptedNodes = JSON.parse(json);
    const nodes = await Promise.all(encryptedNodes.map(async (node) => {
        let content = node.content;
        if (node.encrypted) {
            if (content && typeof content === "object" && !Array.isArray(content)) {
                content = objectToUint8Array(content);
            }
            if (content === undefined) {
                console.error("Content is undefined for node:", node);
                content = new Uint8Array();
            }
            else {
                console.log("Decrypting content");
                console.log("Nonce:", nonceBuffer);
                console.log("Key:", key);
                console.log("Content:", content);
                content = await crypto_ipfs_1.default.crypto.asymmetric.secretBox.decryptMessage(content, nonceBuffer2, key);
            }
        }
        return Object.assign(Object.assign({}, node), { content });
    }));
    const state = new Map();
    if (nodes) {
        nodes.forEach((node) => {
            if (node) {
                state.set(node.id, node);
            }
            else {
                console.log("Undefined node found");
            }
        });
        return state;
    }
    else {
        console.log("No nodes found");
    }
};
exports.deserializeDatabaseSdk = deserializeDatabaseSdk;
const storeDatabase = async (state, key) => {
    console.log("Storing DB...");
    const json = (0, exports.serializeDatabase)(state, key);
    //const buffer = Buffer.from(json);
    const hash = await (0, pinataAPI_1.pinJSONToIPFS)(JSON.parse(json));
    return hash;
};
exports.storeDatabase = storeDatabase;
const retrieveDatabase = async (hash, key) => {
    console.log("Retrieving DB...");
    const json = await (0, pinataAPI_1.fetchFromIPFS)(hash);
    const state = (0, exports.deserializeDatabase)(json, key);
    return state;
};
exports.retrieveDatabase = retrieveDatabase;
const addNode = (state, node) => {
    console.log("Adding Node...");
    const newState = new Map(state);
    // Aggiungi il nodo allo stato
    newState.set(node.id, node);
    // Se il nodo ha un genitore, aggiungi questo nodo all'elenco dei figli del genitore
    if (node.parent) {
        const parent = newState.get(node.parent);
        if (parent && parent.children) {
            parent.children.push(node.id);
            newState.set(node.parent, parent); // Aggiorna il nodo genitore nello stato
        }
    }
    return newState;
};
exports.addNode = addNode;
const removeNode = (state, id) => {
    console.log("Removing Node...");
    const newState = new Map(state);
    // Rimuovi il nodo dallo stato
    const node = newState.get(id);
    newState.delete(id);
    if (node && node.parent) {
        const parent = newState.get(node.parent);
        if (parent && parent.children) {
            const index = parent.children.indexOf(id);
            if (index > -1) {
                parent.children.splice(index, 1);
                newState.set(node.parent, parent); // Aggiorna il nodo genitore nello stato
            }
        }
    }
    return newState;
};
exports.removeNode = removeNode;
const getNode = (state, id) => {
    console.log("Getting Nodes..");
    return state.get(id);
};
exports.getNode = getNode;
const getAllNodes = (state) => {
    console.log("Getting All Nodes..");
    return Array.from(state.values());
};
exports.getAllNodes = getAllNodes;
const getParent = (state, id) => {
    console.log("Getting Parent..");
    const node = state.get(id);
    if (node && node.parent) {
        return state.get(node.parent);
    }
    return null;
};
exports.getParent = getParent;
const updateNode = (state, node) => {
    console.log("Updating Node...");
    return new Map(state).set(node.id, node);
};
exports.updateNode = updateNode;
const getChildren = (state, id) => {
    console.log("Getting Children...");
    const node = state.get(id);
    if (!node || !node.children)
        return [];
    return node.children.map(childId => state.get(childId)).filter(Boolean);
};
exports.getChildren = getChildren;
const query = (state, predicate) => {
    console.log("Execute Query...");
    const nodes = Array.from(state.values());
    const matches = nodes.filter(predicate);
    return matches;
};
exports.query = query;
const storeOnChain = async (state, key, contract) => {
    console.log("Storing on chain...");
    const abi = [
        "event CIDRegistered(string cid)",
        "function registerCID(string memory cidNew) public",
        "function getCID() public view returns (string memory)",
    ];
    const signer = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, new ethers_1.ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL));
    const instance = new ethers_1.ethers.Contract(contract, abi, signer).connect(signer);
    const json = (0, exports.serializeDatabase)(state, key);
    const hash = await (0, pinataAPI_1.pinJSONToIPFS)(JSON.parse(json));
    const tx = await instance.registerCID(ethers_1.ethers.utils.toUtf8Bytes(hash));
    await tx.wait();
    return hash;
};
exports.storeOnChain = storeOnChain;
const getCidOnChain = async (contract) => {
    console.log("Getting CID on chain...");
    const abi = [
        "event CIDRegistered(string cid)",
        "function registerCID(string memory cidNew) public",
        "function getCID() public view returns (string memory)",
    ];
    const signer = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, new ethers_1.ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL));
    const instance = new ethers_1.ethers.Contract(contract, abi, signer).connect(signer);
    const cidBytes = await instance.getCID();
    return ethers_1.ethers.utils.toUtf8String(cidBytes);
};
exports.getCidOnChain = getCidOnChain;
