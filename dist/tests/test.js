"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("../sdk/sdk");
const types_1 = require("../db/types");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TEST_TIMEOUT = 30000; // Aumentiamo il timeout a 30 secondi
const OPERATION_TIMEOUT = 5000; // 5 secondi per operazione
async function run() {
    try {
        console.log("Starting tests...");
        // Test con Pinata
        console.log("Testing with Pinata...");
        const mogu = new sdk_1.Mogu({
            key: 'test',
            storageService: 'PINATA',
            storageConfig: {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || ''
            },
            dbName: 'test-db'
        });
        // Aggiungi peer dopo l'inizializzazione
        mogu.addPeer('http://localhost:8765/gun');
        console.log("Peer added");
        // Attendi che la connessione sia stabilita
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Connection established");
        // Esegui i test
        await runTests(mogu);
        console.log("All tests completed successfully!");
        process.exit(0);
    }
    catch (err) {
        console.error("Test failed with error:", err);
        process.exit(1);
    }
}
async function runTests(mogu) {
    try {
        // Login con retry
        console.log("Attempting login...");
        let loginAttempts = 3;
        // Funzione di login con timeout
        const tryLogin = async () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Login timeout'));
                }, OPERATION_TIMEOUT);
                mogu.login('testuser', 'testpass')
                    .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                    .catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        };
        while (loginAttempts > 0) {
            try {
                await tryLogin();
                console.log('Login successful');
                break;
            }
            catch (err) {
                loginAttempts--;
                if (loginAttempts === 0) {
                    console.error('All login attempts failed');
                    throw err;
                }
                console.log(`Login failed, retrying... (${loginAttempts} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        // Attendi che l'autenticazione sia completamente stabilita
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Test sequenziali
        console.log("\nStarting Basic Operations test...");
        await testBasicOperations(mogu);
        console.log("\nStarting Path Operations test...");
        await testPathOperations(mogu);
        console.log("\nStarting User Space test...");
        await testUserSpace(mogu);
        console.log("\nStarting Queries test...");
        await testQueries(mogu);
        console.log("\nStarting IPFS Backup test...");
        await testIPFSBackup(mogu);
        console.log("\nStarting Peer Management test...");
        await testPeerManagement(mogu);
    }
    catch (err) {
        console.error(`Test failed:`, err);
        throw err;
    }
}
async function testBasicOperations(mogu) {
    const node1 = {
        id: "test/node1",
        type: types_1.NodeType.NODE,
        name: "test-node-1",
        content: "Hello World"
    };
    await Promise.race([
        mogu.addNode(node1),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Add node timeout')), OPERATION_TIMEOUT))
    ]);
    console.log("Node created");
    // Attendi la sincronizzazione
    await new Promise(resolve => setTimeout(resolve, 1000));
    const retrievedNode = await Promise.race([
        mogu.getNode("test/node1"),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Get node timeout')), OPERATION_TIMEOUT))
    ]);
    if (!retrievedNode)
        throw new Error("Node not found");
    console.log("Retrieved node:", retrievedNode);
}
async function testPathOperations(mogu) {
    // Test struttura organizzativa
    const orgNode = {
        id: "organizations/org1",
        type: types_1.NodeType.NODE,
        name: "Test Organization",
        content: {
            name: "Test Org",
            founded: 2023
        }
    };
    await mogu.addNode(orgNode);
    const org = await mogu.getNode("organizations/org1");
    console.log("Organization created:", org);
}
async function testUserSpace(mogu) {
    // Test nodi nello user space
    const privateNote = {
        id: "~/notes/private1",
        type: types_1.NodeType.NODE,
        name: "Private Note",
        content: "This is a private note"
    };
    await mogu.addNode(privateNote);
    const note = await mogu.getNode("~/notes/private1");
    console.log("Private note created:", note);
}
async function testQueries(mogu) {
    // Query by name
    const nodesByName = await mogu.queryByName("Private Note");
    console.log("Nodes by name:", nodesByName);
    // Query by type
    const nodesByType = await mogu.queryByType(types_1.NodeType.NODE);
    console.log("Nodes by type:", nodesByType);
    // Get all nodes
    const allNodes = mogu.getAllNodes();
    console.log("All nodes:", allNodes);
}
async function testIPFSBackup(mogu) {
    // Store current state
    const hash = await mogu.store();
    console.log("State stored with hash:", hash);
    if (hash) {
        // Test pin/unpin
        await mogu.pin();
        console.log("State pinned to IPFS");
        // Load from IPFS
        await mogu.load(hash);
        console.log("State loaded from IPFS");
        // Unpin
        await mogu.unpin(hash);
        console.log("State unpinned from IPFS");
    }
}
// Nuovo test per la gestione dei peer
async function testPeerManagement(mogu) {
    // Test aggiunta peer
    const peers = mogu.addPeer('http://localhost:8766/gun');
    console.log("Added peer, current peers:", peers);
    // Test rimozione peer
    const remainingPeers = mogu.removePeer('http://localhost:8766/gun');
    console.log("Removed peer, remaining peers:", remainingPeers);
    // Test lista peer
    const currentPeers = mogu.getPeers();
    console.log("Current peers:", currentPeers);
    if (currentPeers.length === 0) {
        // Riaggiunge il peer principale per i test successivi
        mogu.addPeer('http://localhost:8765/gun');
    }
}
// Gestione degli errori non catturati
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});
// Avvia i test
run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
