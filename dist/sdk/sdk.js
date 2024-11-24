"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoguOnChain = exports.Mogu = exports.NodeType = void 0;
const index_1 = require("../web3stash/index");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const types_1 = require("../db/types");
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return types_1.NodeType; } });
const gunDb_1 = require("../db/gunDb");
const gun_1 = require("../config/gun");
class Mogu {
    constructor(options = {}) {
        const { key, storageService, storageConfig, dbName, server } = options;
        // Inizializza GUN in base al contesto (server o client)
        const gunInstance = server ? (0, gun_1.initGun)(server) : (0, gun_1.initializeGun)();
        this.gunDb = new gunDb_1.GunMogu(gunInstance, key || '');
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
    // Metodo per aggiungere peer dinamicamente
    addPeer(peerUrl) {
        return this.gunDb.addPeer(peerUrl);
    }
    // Metodo per rimuovere peer
    removePeer(peerUrl) {
        return this.gunDb.removePeer(peerUrl);
    }
    // Metodo per ottenere la lista dei peer attuali
    getPeers() {
        return this.gunDb.getPeers();
    }
    // Metodi delegati a GunDB
    async login(username, password) {
        return this.gunDb.authenticate(username, password);
    }
    onNodeChange(callback) {
        this.gunDb.subscribeToChanges(callback);
    }
    async addNode(node) {
        return this.gunDb.addNode(node);
    }
    async getNode(id) {
        return this.gunDb.getNode(id);
    }
    // Query methods
    async queryByName(name) {
        return this.gunDb.queryByName(name);
    }
    async queryByType(type) {
        return this.gunDb.queryByType(type);
    }
    async queryByContent(content) {
        return this.gunDb.queryByContent(content);
    }
    // Storage service methods
    async store() {
        try {
            const nodes = Array.from(this.gunDb.getState().values());
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
    processKey(hashedKey) {
        if (hashedKey.length > 32) {
            return hashedKey.substring(0, 32);
        }
        else {
            return hashedKey.padEnd(32, "0");
        }
    }
    async load(hash) {
        try {
            if (!this.storageService) {
                throw new Error("Storage service not initialized");
            }
            const data = await this.storageService.downloadJson(hash);
            const nodes = Array.isArray(data) ? data : [data];
            this.gunDb.setState(new Map(nodes.map((node) => [node.id, node])));
            return this.gunDb.getState();
        }
        catch (err) {
            console.error("Error loading state:", err);
            throw err;
        }
    }
    removeNode(id) {
        return this.gunDb.removeNode(id);
    }
    getAllNodes() {
        return Array.from(this.gunDb.getState().values());
    }
    updateNode(node) {
        return this.gunDb.updateNode(node);
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
    // Metodo per accedere all'istanza Gun
    getGun() {
        return this.gunDb.getGunInstance();
    }
}
exports.Mogu = Mogu;
class MoguOnChain extends Mogu {
    constructor(contractAddress, signer, options = {}) {
        super(options);
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
