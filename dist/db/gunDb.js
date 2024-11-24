"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GunMogu = void 0;
const gun_1 = __importDefault(require("gun"));
require("gun/sea");
const types_1 = require("./types");
class GunMogu {
    constructor(gunInstance, encryptionKey = '') {
        this.peers = new Set();
        // Gestione dello stato interno
        this.state = new Map();
        this.encryptionKey = encryptionKey;
        this.gun = gunInstance;
        this.user = this.gun.user();
        this.nodes = this.gun.get('nodes');
        this.sea = gun_1.default.SEA;
    }
    // Gestione dei peer
    addPeer(peerUrl) {
        if (!this.peers.has(peerUrl)) {
            this.gun.opt({ peers: [peerUrl] });
            this.peers.add(peerUrl);
        }
        return Array.from(this.peers);
    }
    removePeer(peerUrl) {
        if (this.peers.has(peerUrl)) {
            this.peers.delete(peerUrl);
            // Ricrea la connessione con i peer rimanenti
            this.gun.opt({ peers: Array.from(this.peers) });
        }
        return Array.from(this.peers);
    }
    getPeers() {
        return Array.from(this.peers);
    }
    // Autenticazione
    async authenticate(username, password) {
        return new Promise((resolve, reject) => {
            // Se l'utente è già autenticato, disconnettilo prima
            if (this.user.is) {
                this.user.leave();
                // Attendi che la disconnessione sia completata
                setTimeout(() => {
                    this.tryAuthenticate(username, password, resolve, reject);
                }, 1000);
            }
            else {
                this.tryAuthenticate(username, password, resolve, reject);
            }
        });
    }
    tryAuthenticate(username, password, resolve, reject) {
        // Prima prova ad autenticare
        this.user.auth(username, password, async (authAck) => {
            if (authAck.err) {
                // Se l'utente non esiste, crealo
                if (authAck.err.indexOf('no user') !== -1) {
                    this.user.create(username, password, async (createAck) => {
                        if (createAck.err) {
                            reject(createAck.err);
                        }
                        else {
                            // Dopo la creazione, attendi un momento e prova ad autenticare
                            setTimeout(() => {
                                this.user.auth(username, password, async (finalAuthAck) => {
                                    if (finalAuthAck.err) {
                                        reject(finalAuthAck.err);
                                    }
                                    else {
                                        await this.initializeSEA(finalAuthAck);
                                        resolve(finalAuthAck);
                                    }
                                });
                            }, 1000);
                        }
                    });
                }
                else {
                    reject(authAck.err);
                }
            }
            else {
                await this.initializeSEA(authAck);
                resolve(authAck);
            }
        });
    }
    // Inizializza SEA dopo l'autenticazione
    async initializeSEA(ack) {
        try {
            // Attendi un momento per assicurarsi che l'autenticazione sia completata
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Usa la chiave di crittografia se presente
            if (this.encryptionKey && this.encryptionKey.length > 0) {
                console.log("Using encryption with key");
                this.pair = await this.sea.pair();
                this.pair.epriv = this.encryptionKey;
            }
            else {
                console.log("No encryption key provided, using clear text");
                this.pair = null;
            }
            if (this.user.is) {
                await this.user.get('pair').put(this.pair);
            }
        }
        catch (err) {
            console.error('Error initializing SEA:', err);
            throw err;
        }
    }
    parseNodePath(id) {
        // Rimuove eventuali slash iniziali e finali e splitta il path
        return id.replace(/^\/+|\/+$/g, '').split('/');
    }
    async getGunReference(path) {
        let ref = this.nodes;
        // Se inizia con ~ usa lo user space
        if (path[0] === '~') {
            if (!this.user.is) {
                throw new Error('User not authenticated for user space access');
            }
            ref = this.user;
            path = path.slice(1); // Rimuove il ~
        }
        // Costruisce il riferimento attraverso il path
        for (const segment of path) {
            if (!ref) {
                throw new Error(`Invalid path: ${path.join('/')}`);
            }
            ref = ref.get(segment);
        }
        return ref;
    }
    // Sposta qui la logica di conversione dei nodi
    convertToStandardNode(gunNode) {
        return {
            id: gunNode.id,
            type: gunNode.type,
            name: gunNode.name,
            content: gunNode.content,
            encrypted: gunNode.encrypted
        };
    }
    // Metodi per la gestione dello stato
    getState() {
        return this.state;
    }
    setState(newState) {
        this.state = newState;
    }
    // Metodi per la gestione dei nodi
    async addNode(node) {
        await this.addNodeToGun(node);
        this.state.set(node.id, node);
        return this.state;
    }
    async addNodeToGun(node) {
        if (!this.user.is) {
            throw new Error('User not authenticated');
        }
        try {
            let secureNode = {
                ...node,
                encrypted: false
            };
            // Prepara il contenuto (con eventuale crittografia)
            if (this.pair && node.content) {
                console.log("Encrypting content:", node.content);
                const contentJson = typeof node.content === 'string' ?
                    JSON.stringify({ value: node.content }) :
                    JSON.stringify(node.content);
                const encryptedContent = await this.sea.encrypt(contentJson, this.pair);
                console.log("Encrypted content:", encryptedContent);
                secureNode.content = encryptedContent;
                secureNode.encrypted = true;
            }
            else {
                console.log("Storing content in clear text");
                secureNode.content = node.content;
            }
            // Parse il path e ottiene il riferimento corretto
            const pathSegments = this.parseNodePath(node.id);
            console.log("Path segments:", pathSegments);
            return new Promise((resolve, reject) => {
                try {
                    let currentRef = this.nodes;
                    // Se è nello user space
                    if (pathSegments[0] === '~') {
                        currentRef = this.user;
                        pathSegments.shift();
                    }
                    // Crea i nodi intermedi se necessario
                    pathSegments.forEach((segment, index) => {
                        if (index === pathSegments.length - 1) {
                            // Ultimo segmento - salva il nodo
                            currentRef.get(segment).put(secureNode, (ack) => {
                                if (ack.err) {
                                    reject(ack.err);
                                    return;
                                }
                                console.log("Node saved at path:", pathSegments.join('/'));
                                resolve(secureNode);
                            });
                        }
                        else {
                            // Nodi intermedi
                            currentRef = currentRef.get(segment);
                        }
                    });
                }
                catch (err) {
                    reject(err);
                }
            });
        }
        catch (err) {
            console.error('Error in addNode:', err);
            throw err;
        }
    }
    async getNode(id) {
        const gunNode = await this.getNodeFromGun(id);
        if (gunNode) {
            this.state.set(id, gunNode);
            return gunNode;
        }
        return this.state.get(id) || null;
    }
    async getNodeFromGun(id) {
        console.log("GunMogu: Starting getNode...", id);
        if (!this.user.is) {
            throw new Error('User not authenticated');
        }
        try {
            // Parse il path e ottiene il riferimento
            const pathSegments = this.parseNodePath(id);
            console.log("Path segments:", pathSegments);
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log("GunMogu: getNode timed out");
                    resolve(null);
                }, 5000);
                let currentRef = this.nodes;
                // Se è nello user space
                if (pathSegments[0] === '~') {
                    currentRef = this.user;
                    pathSegments.shift();
                }
                // Naviga attraverso il path
                pathSegments.forEach((segment, index) => {
                    currentRef = currentRef.get(segment);
                });
                // Leggi il nodo finale
                currentRef.once(async (node) => {
                    clearTimeout(timeout);
                    console.log("GunMogu: Raw node received:", node);
                    if (!node) {
                        console.log("GunMogu: Node not found");
                        resolve(null);
                        return;
                    }
                    try {
                        let decryptedContent = node.content;
                        if (node.encrypted && this.pair && node.content) {
                            console.log("GunMogu: Decrypting content...");
                            try {
                                const decrypted = await this.sea.decrypt(node.content, this.pair);
                                if (decrypted) {
                                    if (typeof decrypted === 'string') {
                                        try {
                                            const parsed = JSON.parse(decrypted);
                                            decryptedContent = parsed.value || parsed;
                                        }
                                        catch {
                                            decryptedContent = decrypted;
                                        }
                                    }
                                    else {
                                        decryptedContent = decrypted.value || decrypted;
                                    }
                                }
                            }
                            catch (decryptError) {
                                console.error("GunMogu: Decryption error:", decryptError);
                                decryptedContent = node.content;
                            }
                        }
                        else {
                            console.log("GunMogu: Content is in clear text");
                            decryptedContent = node.content;
                        }
                        const standardNode = {
                            id: node.id || id, // Usa l'ID originale se non presente nel nodo
                            type: node.type || types_1.NodeType.NODE,
                            name: node.name,
                            content: decryptedContent,
                            encrypted: node.encrypted
                        };
                        console.log("GunMogu: Node processed successfully:", standardNode);
                        resolve(standardNode);
                    }
                    catch (err) {
                        console.error('GunMogu: Error processing node:', err);
                        resolve(null);
                    }
                });
            });
        }
        catch (err) {
            console.error('Error getting node:', err);
            return null;
        }
    }
    // Aggiornamento nodo
    async updateNode(node) {
        return this.addNode(node);
    }
    // Rimozione nodo
    async removeNode(id) {
        return new Promise((resolve) => {
            this.nodes.get(id).put(null, (ack) => {
                resolve(ack);
            });
        });
    }
    // Query methods
    async queryByName(name) {
        const nodes = [];
        return new Promise((resolve) => {
            this.nodes.map().once(async (node) => {
                if (node && node.name === name) {
                    const decryptedNode = await this.getNode(node.id);
                    if (decryptedNode) {
                        nodes.push(decryptedNode);
                    }
                }
                resolve(nodes);
            });
        });
    }
    async queryByType(type) {
        const nodes = [];
        return new Promise((resolve) => {
            this.nodes.map().once(async (node) => {
                if (node && node.type === type) {
                    const decryptedNode = await this.getNode(node.id);
                    if (decryptedNode) {
                        nodes.push(decryptedNode);
                    }
                }
                resolve(nodes);
            });
        });
    }
    async queryByContent(content) {
        const nodes = [];
        return new Promise((resolve) => {
            this.nodes.map().once(async (node) => {
                if (node && String(node.content) === content) {
                    const decryptedNode = await this.getNode(node.id);
                    if (decryptedNode) {
                        nodes.push(decryptedNode);
                    }
                }
                resolve(nodes);
            });
        });
    }
    // Sottoscrizione a cambiamenti
    subscribeToChanges(callback) {
        this.gun.map().on(async (gunNode, id) => {
            if (gunNode) {
                const standardNode = this.convertToStandardNode(gunNode);
                this.state.set(id, standardNode);
                callback(standardNode);
            }
        });
    }
    // Aggiungi un getter per accedere all'istanza Gun
    getGunInstance() {
        return this.gun;
    }
    // Metodo per accedere all'istanza Gun
    getGun() {
        return this.gun;
    }
}
exports.GunMogu = GunMogu;
