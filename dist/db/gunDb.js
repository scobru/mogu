"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GunMogu = void 0;
const gun_1 = __importDefault(require("gun"));
require("gun/sea");
const types_1 = require("./types");
const ipfsAdapter_1 = require("./adapters/ipfsAdapter");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const gunPluginManager_1 = require("../plugins/gunPluginManager");
const plugins_1 = require("../plugins");
class GunMogu {
    constructor(gunInstance, peers = [], useIpfs = false, encryptionKey = '') {
        this.encryptionKey = encryptionKey;
        // Registra i plugin prima di inizializzare Gun
        (0, plugins_1.registerGunPlugins)();
        if (gunInstance) {
            this.gun = gunInstance;
        }
        else {
            // Usa una directory temporanea per i file di Gun
            const gunPath = path_1.default.join(os_1.default.tmpdir(), 'gun-data');
            const options = {
                peers,
                localStorage: false,
                radisk: false,
                file: gunPath,
                multicast: false,
                axe: false
            };
            this.gun = (0, gun_1.default)(options);
        }
        if (useIpfs) {
            this.ipfsAdapter = new ipfsAdapter_1.IPFSAdapter(this.gun, {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || ''
            });
        }
        this.user = this.gun.user();
        this.nodes = this.gun.get('nodes');
        this.sea = gun_1.default.SEA;
        this.gun.on('error', (err) => {
            console.error('Gun error:', err);
        });
        // Inizializza i plugin
        gunPluginManager_1.GunPluginManager.initializePlugins(this.gun);
    }
    // Autenticazione
    async authenticate(username, password) {
        return new Promise((resolve, reject) => {
            // Prima prova a creare l'utente
            this.user.create(username, password, (ack) => {
                if (ack.err && ack.err.indexOf('already') !== -1) {
                    console.log("User already created!");
                    // Se l'utente esiste già, prova ad autenticarlo
                    this.user.auth(username, password, async (authAck) => {
                        if (authAck.err) {
                            reject(authAck.err);
                        }
                        else {
                            await this.initializeSEA(authAck);
                            resolve(authAck);
                        }
                    });
                }
                else if (ack.err) {
                    reject(ack.err);
                }
                else {
                    this.initializeSEA(ack).then(() => resolve(ack));
                }
            });
        });
    }
    // Inizializza SEA dopo l'autenticazione
    async initializeSEA(ack) {
        try {
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
            await this.user.get('pair').put(this.pair);
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
    async addNode(node) {
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
    // Query in tempo reale
    async queryByType(type, callback) {
        this.nodes.map().once(async (node) => {
            if (node && node.type === type) {
                const decryptedNode = await this.getNode(node.id);
                if (decryptedNode) {
                    callback([decryptedNode]);
                }
            }
        });
    }
    // Backup su IPFS
    async backupToIPFS() {
        return new Promise((resolve) => {
            this.nodes.once(async (allNodes) => {
                if (!allNodes) {
                    resolve(null);
                    return;
                }
                const nodes = Object.entries(allNodes).map(([id, node]) => ({
                    id,
                    ...node,
                    _: undefined
                }));
                const key = `backup-${Date.now()}`;
                await this.ipfsAdapter?.put(key, nodes);
                const result = await this.ipfsAdapter?.get(key);
                resolve(result);
            });
        });
    }
    // Sottoscrizione a cambiamenti
    subscribeToChanges(callback) {
        // Sottoscrizione a tutti i cambiamenti nel public space
        this.gun.map().on(async (node, id) => {
            if (node) {
                const decryptedNode = await this.getNode(id);
                if (decryptedNode) {
                    callback(decryptedNode);
                }
            }
        });
        // Se l'utente è autenticato, sottoscrizione anche allo user space
        if (this.user.is) {
            this.user.map().on(async (node, id) => {
                if (node) {
                    const decryptedNode = await this.getNode(`~${id}`);
                    if (decryptedNode) {
                        callback(decryptedNode);
                    }
                }
            });
        }
    }
    // Aggiungi un getter per accedere all'istanza Gun
    getGunInstance() {
        return this.gun;
    }
    // Metodo generico per accedere ai plugin
    plugin(name) {
        const plugin = gunPluginManager_1.GunPluginManager.getPlugin(name);
        if (!plugin)
            return undefined;
        // Crea un wrapper per i metodi del plugin
        const wrapper = {};
        if (plugin.chainMethods) {
            Object.entries(plugin.chainMethods).forEach(([methodName, method]) => {
                wrapper[methodName] = (...args) => method.apply(this.gun, args);
            });
        }
        if (plugin.staticMethods) {
            Object.entries(plugin.staticMethods).forEach(([methodName, method]) => {
                wrapper[methodName] = (...args) => method.apply(null, args);
            });
        }
        return wrapper;
    }
    // Metodo per accedere all'istanza Gun
    getGun() {
        return this.gun;
    }
}
exports.GunMogu = GunMogu;
