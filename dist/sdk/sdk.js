"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoguOnChain = exports.Mogu = exports.NodeType = void 0;
const index_1 = require("../web3stash/index");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const types_1 = require("../db/types");
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return types_1.NodeType; } });
const gunDb_1 = require("../db/gunDb");
const server_1 = require("../server");
const db_1 = require("../db/db");
const nameQuery = (name) => (node) => node.name === name;
const typeQuery = (type) => (node) => node.type === type;
const contentQuery = (content) => (node) => String(node.content) === content;
class Mogu {
    constructor(peers = [], key, storageService, storageConfig, dbName) {
        this.gunDb = new gunDb_1.GunMogu(server_1.gun, peers, false, key || '');
        this.state = new Map();
        this.dbName = dbName || 'default-db';
        if (key && key.length > 0) {
            const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
            const processedKey = this.processKey(hashedKey);
            this.key = new TextEncoder().encode(processedKey);
        }
        else {
            this.key = new TextEncoder().encode('');
        }
        if (storageService && storageConfig) {
            this.storageService = (0, index_1.Web3Stash)(storageService, storageConfig);
        }
    }
    // Nuovi metodi GunDB
    async login(username, password) {
        return this.gunDb.authenticate(username, password);
    }
    onNodeChange(callback) {
        const convertToStandardNode = (gunNode) => ({
            id: gunNode.id,
            type: gunNode.type,
            name: gunNode.name,
            content: gunNode.content,
            encrypted: gunNode.encrypted
        });
        this.gunDb.subscribeToChanges((gunNode) => {
            callback(convertToStandardNode(gunNode));
        });
    }
    async addNode(node) {
        await this.gunDb.addNode(node);
        this.state.set(node.id, node);
        return this.state;
    }
    async getNode(id) {
        const gunNode = await this.gunDb.getNode(id);
        if (gunNode) {
            this.state.set(id, gunNode);
            return gunNode;
        }
        return this.state.get(id) || null;
    }
    initializeDatabase() {
        console.log("Initializing database...");
        return new Map();
    }
    serialize() {
        console.log("Serialize");
        const serialized = (0, db_1.serializeDatabase)(this.state);
        console.log("Serialized:", serialized);
        return serialized;
    }
    deserialize(json) {
        console.log("Deserialize");
        const deserialized = (0, db_1.deserializeDatabase)(json);
        console.log("Deserialized:", deserialized);
        return deserialized;
    }
    async store() {
        console.log("Store");
        try {
            const nodes = Array.from(this.state.values());
            if (!this.storageService) {
                throw new Error("Storage service not initialized");
            }
            const result = await this.storageService.uploadJson(nodes);
            console.log("State stored with hash:", result.id);
            return result.id;
        }
        catch (err) {
            console.error("Error storing state:", err);
            return undefined;
        }
    }
    isEncryptedNode(value) {
        return (value &&
            typeof value === "object" &&
            typeof value.id === "string" &&
            typeof value.name === "string" &&
            Object.values(types_1.NodeType).includes(value.type) &&
            (value.encrypted === undefined || typeof value.encrypted === "boolean"));
    }
    processKey(hashedKey) {
        if (hashedKey.length > 32) {
            return hashedKey.substring(0, 32);
        }
        else {
            return hashedKey.padEnd(32, "0");
        }
    }
    async retrieve(hash) {
        console.log("Retrieve");
        return await (0, db_1.retrieveDatabase)(hash);
    }
    async load(hash) {
        console.log("Load");
        const state = await (0, db_1.retrieveDatabase)(hash);
        this.state = new Map(state.map((node) => [node.id, node]));
        return this.state;
    }
    removeNode(id) {
        return (0, db_1.removeNode)(this.state, id);
    }
    getAllNodes() {
        console.log("Get All Nodes");
        return (0, db_1.getAllNodes)(this.state);
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
    query(predicate) {
        console.log("Query");
        const nodes = this.getAllNodes();
        console.log("Nodes:", nodes);
        return nodes.filter(predicate);
    }
    async pin() {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        const hash = await this.store();
        if (hash) {
            await this.storageService.uploadJson({ hash });
        }
    }
    async unpin(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        await this.storageService.unpin(hash);
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
    // Metodo per accedere all'istanza Gun
    getGun() {
        return this.gunDb.getGunInstance();
    }
    // Esempio di utilizzo del plugin chain
    async useChainPlugin() {
        const gun = this.getGun();
        // Ora puoi usare il plugin
        gun.chain.tuaFunzione();
    }
    // Wrapper per le funzionalità del plugin
    async chainOperation(path) {
        const gun = this.getGun();
        const result = await gun.chain.operation(path);
        // Converti il risultato nel formato Mogu
        const node = {
            id: path,
            type: types_1.NodeType.NODE,
            name: result.name,
            content: result.data
        };
        // Aggiorna lo stato interno
        this.state.set(node.id, node);
        return node;
    }
    // Metodo per accedere ai plugin
    plugin(name) {
        return this.gunDb.plugin(name);
    }
    // Accedi direttamente all'istanza Gun con i plugin
    gun() {
        return this.gunDb.getGun();
    }
}
exports.Mogu = Mogu;
class MoguOnChain extends Mogu {
    constructor(contractAddress, signer, peers = [], initialState, key) {
        super(peers, key);
        this.abi = [
            "event CIDRegistered(string cid)",
            "function registerCID(string memory cidNew) public",
            "function getCID() public view returns (string memory)",
        ];
        this.contract = new ethers_1.ethers.Contract(contractAddress, this.abi, signer).connect(signer);
    }
    async registerCIDOnChain() {
        const hash = await this.store();
        if (!hash) {
            throw new Error('Failed to store data');
        }
        const tx = await this.contract.registerCID(ethers_1.ethers.utils.toUtf8Bytes(hash));
        await tx.wait();
    }
    async getCurrentCIDFromChain() {
        const cidBytes = await this.contract.cid();
        return ethers_1.ethers.utils.toUtf8String(cidBytes);
    }
}
exports.MoguOnChain = MoguOnChain;
