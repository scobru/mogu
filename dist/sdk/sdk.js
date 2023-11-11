"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoguOnChain = exports.Mogu = void 0;
const pinataAPI_1 = require("../ipfs/pinataAPI");
const ethers_1 = require("ethers");
const db_1 = require("../db/db");
const pinataAPI_2 = require("../ipfs/pinataAPI");
const utils_1 = require("ethers/lib/utils");
const nameQuery = (name) => (node) => node.name === name;
const typeQuery = (type) => (node) => node.type === type;
const contentQuery = (content) => (node) => String(node.content) === content;
const childrenQuery = (children) => (node) => Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent) => (node) => node.parent === parent;
class Mogu {
    constructor(key, pinataApiKey, pinataApiSecret, dbName) {
        this.state = this.initializeDatabase();
        // Hash the key string
        const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
        key = this.processKey(hashedKey);
        const keyUint8Array = new TextEncoder().encode(key);
        this.key = keyUint8Array;
        this.dbName = dbName;
        (0, pinataAPI_2.setCredentials)(String(pinataApiKey), String(pinataApiSecret), this.dbName);
    }
    initializeDatabase() {
        console.log("Initializing database...");
        return new Map();
    }
    serialize() {
        console.log("Serialize");
        const serialized = (0, db_1.serializeDatabase)(this.state, this.key);
        console.log("Serialized:", serialized);
        return serialized;
    }
    deserialize(json) {
        console.log("Deserialize");
        const deserialized = (0, db_1.deserializeDatabase)(json, this.key);
        console.log("Deserialized:", deserialized);
        return deserialized;
    }
    async store() {
        console.log("Store");
        let newState;
        if (this.state instanceof Map) {
            // Additional check: Ensure all keys are strings and all values are EncryptedNode
            for (let [key, value] of this.state) {
                if (typeof key !== 'string' || !this.isEncryptedNode(value)) {
                    console.error("Invalid state: All keys must be strings and all values must be EncryptedNode");
                    return;
                }
            }
            return await (0, db_1.storeDatabase)(this.state, this.key);
        }
        else {
            newState = await (0, db_1.serializeDatabase)(this.state, this.key);
            return await (0, db_1.storeDatabase)(this.state, this.key);
        }
    }
    // Helper function to check if a value is an EncryptedNode
    isEncryptedNode(value) {
        // Replace this with your actual check
        return value && typeof value === 'object' && 'id' in value && 'type' in value && 'name' in value && 'parent' in value && 'children' in value && 'content' in value && 'encrypted' in value;
    }
    processKey(hashedKey) {
        if (hashedKey.length > 32) {
            return hashedKey.substring(0, 32);
        }
        else {
            return hashedKey.padEnd(32, '0');
        }
    }
    async retrieve(hash) {
        console.log("Retrieve");
        return await (0, db_1.retrieveDatabase)(hash, this.key);
    }
    async load(hash) {
        console.log("Load");
        const state = await (0, db_1.retrieveDatabase)(hash, this.key);
        this.state = new Map(state.map(node => [node.id, node]));
        return this.state;
    }
    addNode(node) {
        console.log("Add Node");
        this.state = (0, db_1.addNode)(this.state, node);
        return this.state;
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
        if (!this.state.has(node.id)) {
            console.log("Node with ID not found in state:", node.id);
            return;
        }
        this.state = (0, db_1.updateNode)(this.state, node);
        console.log("Update Complete!");
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
        console.log("Nodes:", nodes);
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
        super(key);
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
