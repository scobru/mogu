"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCidOnChain = exports.storeOnChain = exports.query = exports.getChildren = exports.updateNode = exports.getParent = exports.getAllNodes = exports.getNode = exports.removeNode = exports.addNode = exports.retrieveDatabase = exports.storeDatabase = exports.deserializeDatabase = exports.serializeDatabase = void 0;
const pinataAPI_1 = require("../ipfs/pinataAPI");
const crypto_ipfs_1 = __importDefault(require("@scobru/crypto-ipfs"));
const ethers_1 = require("ethers");
const NONCE_LENGTH = 24;
let tempCID;
/**
 * Serialize the database
 * @param {Map<string, EncryptedNode>} state - The state of the database
 * @param {Uint8Array} key - The key used to encrypt the database
 * @returns
 */
const serializeDatabase = async (state, key) => {
    console.log("Serializing DB");
    const nodes = Array.from(state.values());
    const nonce = await crypto_ipfs_1.default.crypto.asymmetric.generateNonce();
    const encryptedNodes = nodes.map(node => {
        if (!node.content) {
            console.warn("Content is undefined for node:", node);
            return node;
        }
        return Object.assign(Object.assign({}, node), { content: Buffer.concat([
                Buffer.from(nonce),
                Buffer.from(crypto_ipfs_1.default.crypto.asymmetric.secretBox.encryptMessage(node.content, nonce, key)),
            ]), encrypted: true });
    });
    const json = JSON.stringify(encryptedNodes);
    return json;
};
exports.serializeDatabase = serializeDatabase;
/**
 * Deserialize the database
 * @param {string} json - The serialized database
 * @param {Uint8Array} key - The key used to decrypt the database
 * @returns
 */
const deserializeDatabase = async (json, key) => {
    console.log("Deserializing DB");
    const encryptedNodes = JSON.parse(JSON.stringify(json));
    console.log("Encrypted nodes:", encryptedNodes);
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
                const contentBuffer = Buffer.from(node.content, "hex");
                const nonce = contentBuffer.slice(0, NONCE_LENGTH);
                const ciphertext = contentBuffer.slice(NONCE_LENGTH);
                content = await crypto_ipfs_1.default.crypto.asymmetric.secretBox.decryptMessage(new Uint8Array(ciphertext), new Uint8Array(nonce), key);
            }
        }
        return Object.assign(Object.assign({}, node), { content });
    }));
    return nodes;
};
exports.deserializeDatabase = deserializeDatabase;
function objectToUint8Array(obj) {
    const arr = Object.values(obj);
    return new Uint8Array(arr);
}
const storeDatabase = async (state, key) => {
    console.log("Store DB");
    const json = await (0, exports.serializeDatabase)(state, key);
    const hash = await (0, pinataAPI_1.pinJSONToIPFS)(JSON.parse(json));
    if (tempCID) {
        (0, pinataAPI_1.unpinFromIPFS)(tempCID);
        tempCID = hash;
    }
    return hash;
};
exports.storeDatabase = storeDatabase;
const retrieveDatabase = async (hash, key) => {
    console.log("Retrieve DB");
    tempCID = hash;
    const json = await (0, pinataAPI_1.fetchFromIPFS)(hash);
    const state = await (0, exports.deserializeDatabase)(json, key);
    return state;
};
exports.retrieveDatabase = retrieveDatabase;
const addNode = (state, node) => {
    console.log("Adding Node");
    // Verifica se il nodo esiste già
    if (state.has(node.id)) {
        console.log("Node already exists, updating instead");
        const existingNode = state.get(node.id);
        // Aggiorna il nodo esistente con i nuovi valori
        const updatedNode = Object.assign(Object.assign({}, existingNode), node);
        state.set(node.id, updatedNode);
    }
    else {
        console.log("Node does not exist, adding new node");
        state.set(node.id, node);
    }
    // Gestione genitore e figli se necessario
    if (node.parent) {
        const parent = state.get(node.parent);
        if (parent && parent.children) {
            // Aggiorna l'elenco dei figli del genitore per includere questo nodo
            if (!parent.children.includes(node.id)) {
                parent.children.push(node.id);
            }
            state.set(node.parent, parent);
        }
    }
    return state;
};
exports.addNode = addNode;
const removeNode = (state, id) => {
    console.log("Removing Node");
    const node = state.get(id);
    console.log("Node", node);
    if (!node) {
        console.error("Node not found with id:", id);
        return state; // or throw an error
    }
    // Handle children of the node if necessary
    // For example, delete children or reassign them
    state.delete(id);
    if (node.parent) {
        const parent = state.get(node.parent);
        if (parent && parent.children) {
            const index = parent.children.indexOf(id);
            if (index > -1) {
                parent.children.splice(index, 1);
                state.set(node.parent, parent);
            }
        }
    }
    return state;
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
const updateNode = (state, updatedNode) => {
    if (state.has(updatedNode.id)) {
        console.log("Node exists, updating");
        // Aggiorna il nodo esistente con i nuovi valori
        const existingNode = state.get(updatedNode.id);
        const newNode = Object.assign(Object.assign({}, existingNode), updatedNode);
        state.set(updatedNode.id, newNode);
    }
    else {
        console.error("Node not found, cannot update");
        // Qui puoi gestire l'errore come preferisci
        // Ad esempio, potresti lanciare un'eccezione o semplicemente non fare nulla
    }
    return state;
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
    const json = await (0, exports.serializeDatabase)(state, key);
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
