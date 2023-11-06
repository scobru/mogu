"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoguOnChain = exports.Mogu = void 0;
const pinataAPI_1 = require("../ipfs/pinataAPI");
const ethers_1 = require("ethers");
const db_1 = require("../db/db");
const pinataAPI_2 = require("../ipfs/pinataAPI");
const nameQuery = (name) => (node) => node.name === name;
const typeQuery = (type) => (node) => node.type === type;
const contentQuery = (content) => (node) => String(node.content) === content;
const childrenQuery = (children) => (node) => Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent) => (node) => node.parent === parent;
class Mogu {
    constructor(initialState, key, nonce, pinataApiKey, pinataApiSecret) {
        this.state = initialState == null ? initialState || new Map() : this.initializeDatabase();
        if (key && (key === null || key === void 0 ? void 0 : key.length) > 32) {
            key = key.substring(0, 32);
            console.log("Key truncated to 32 characters:", key);
        }
        else if (key && key.length < 32) {
            key = key.padEnd(32, "0");
            console.log("Key padded to 32 characters:", key);
        }
        const keyUint8Array = new TextEncoder().encode(key);
        const nonceBuffer = Buffer.from(String(nonce), "hex");
        // const nonceUint8Array = new Uint8Array(nonceBuffer);
        this.nonce = nonceBuffer;
        this.key = keyUint8Array;
        (0, pinataAPI_2.setCredentials)(String(pinataApiKey), String(pinataApiSecret));
    }
    initializeDatabase() {
        console.log("Initializing database...");
        return new Map();
    }
    serialize() {
        console.log("Serialize");
        const serialized = (0, db_1.serializeDatabaseSdk)(this.state, this.key, this.nonce);
        console.log("Serialized:", serialized);
        return serialized;
    }
    deserialize(json) {
        console.log("Deserialize");
        const deserialized = (0, db_1.deserializeDatabaseSdk)(json, this.key, this.nonce);
        console.log("Deserialized:", deserialized);
        return deserialized;
    }
    async store() {
        console.log("Store SDK");
        return await (0, db_1.storeDatabaseSDK)(this.state, this.key, this.nonce);
    }
    async retrieve(hash) {
        console.log("Retrieve");
        return await (0, db_1.retrieveDatabase)(hash, this.key);
    }
    async load(hash) {
        console.log("Load");
        const json = await (0, pinataAPI_1.fetchFromIPFS)(hash);
        const deserialized = await (0, db_1.deserializeDatabaseSdk)(JSON.stringify(json), this.key, this.nonce);
        if (deserialized instanceof Map) {
            this.state = new Map(deserialized);
        }
        else {
            console.log("Deserialized is not a Map");
        }
        console.log("Deserialized:", deserialized);
        return deserialized;
    }
    addNode(node) {
        console.log("Add Node");
        const state = (0, db_1.addNode)(this.state, node);
        this.state = state;
        return state;
    }
    removeNode(id) {
        return (0, db_1.removeNode)(this.state, id);
    }
    getNode(id) {
        console.log("Get Node");
        return (0, db_1.getNode)(this.state, id);
    }
    getAllNodes() {
        console.log("Get All Node");
        return (0, db_1.getAllNodes)(this.state);
    }
    getParent(id) {
        console.log("Get Parent");
        const node = this.state.get(id);
        if (node && node.parent) {
            return this.state.get(node.parent);
        }
        console.log("No Parent");
        return null;
    }
    updateNode(node) {
        console.log("Update Node");
        const result = (0, db_1.updateNode)(this.state, node);
        this.state = result;
        console.log("Update Complete!", result);
        return node;
    }
    getChildren(id) {
        console.log("Get Children");
        const node = this.state.get(id);
        if (!node || !node.children)
            return [];
        return node.children.map(childId => this.state.get(childId)).filter(Boolean);
    }
    query(predicate) {
        console.log("Query");
        const nodes = this.getAllNodes();
        return nodes.filter(predicate);
    }
    async pin() {
        const hash = await this.store();
        await (0, pinataAPI_1.pinJSONToIPFS)(hash);
    }
    async unpin(hash) {
        await (0, pinataAPI_1.unpinFromIPFS)(hash);
    }
    queryByName(name) {
        console.log("Query by Name");
        return this.query(nameQuery(name));
    }
    queryByType(type) {
        console.log("Query by Type");
        return this.query(typeQuery(type));
    }
    queryByContent(content) {
        console.log("Query by Content");
        return this.query(contentQuery(content));
    }
    queryByChildren(children) {
        console.log("Query by Children");
        return this.query(childrenQuery(children));
    }
    queryByParent(parent) {
        console.log("Query by Parent");
        return this.query(parentQuery(parent));
    }
}
exports.Mogu = Mogu;
class MoguOnChain extends Mogu {
    constructor(contractAddress, signer, initialState, key) {
        super(initialState, key);
        this.abi = [
            "event CIDRegistered(string cid)",
            "function registerCID(string memory cidNew) public",
            "function getCID() public view returns (string memory)",
        ];
        this.contract = new ethers_1.ethers.Contract(contractAddress, this.abi, signer).connect(signer);
    }
    async registerCIDOnChain() {
        const hash = await this.store(); // Questo è il metodo store della classe padre (NodeDatabase)
        const tx = await this.contract.registerCID(ethers_1.ethers.utils.toUtf8Bytes(hash));
        await tx.wait();
    }
    // Se desideri anche un metodo per ottenere il CID corrente dal contratto:
    async getCurrentCIDFromChain() {
        const cidBytes = await this.contract.cid();
        return ethers_1.ethers.utils.toUtf8String(cidBytes);
    }
}
exports.MoguOnChain = MoguOnChain;
