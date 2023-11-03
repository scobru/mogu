"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../core/db");
const pinataAPI_1 = require("../ipfs/pinataAPI");
async function run() {
    try {
        let state = initializeDatabase();
        state = await addSampleNodes(state);
        state = await addFileToDirectory(state);
        state = await addAnotherFileAndList(state);
        const key = "my-key";
        const cid = await performDatabaseOperations(state, key);
        console.log("CID:", cid);
        queryDatabase(state);
        await serializeAndDeserializeDatabase(state, key);
        addFileAndStore(cid, key);
    }
    catch (err) {
        console.error("An error occurred during the test:", err);
    }
}
function initializeDatabase() {
    console.log("Initializing database...");
    return new Map();
}
async function addSampleNodes(state) {
    console.log("Adding sample nodes...");
    const node = {
        id: "1",
        type: "DIRECTORY",
        name: "my-node",
        content: "testDir",
        children: [],
        encrypted: false
    };
    state = (0, db_1.addNode)(state, node);
    console.log("Sample nodes added", Array.from(state.values()));
    const result = (0, db_1.removeNode)(state, "1");
    console.log("Sample nodes removed", result);
    // Update a node in the database
    const update = (0, db_1.updateNode)(state, Object.assign(Object.assign({}, node), { content: "Updated content" }));
    console.log("Sample nodes updated", update);
    // Retrieve a single node from the database
    const retrievedNode = (0, db_1.getNode)(state, "1");
    console.log("Retrieved node", retrievedNode);
    // Retrieve the children of a node
    const children = (0, db_1.getChildren)(state, "1");
    console.log("Retrieved children", children);
    // Query the database
    const nameQuery = (name) => (node) => node.name === name;
    const nodesWithName = (0, db_1.query)(state, nameQuery("my-node"));
    console.log("Nodes with name", nodesWithName);
    const nameIndex = new Map();
    const updateNameIndex = (state) => {
        nameIndex.clear();
        state.forEach((node, id) => {
            const name = node.name;
            if (!nameIndex.has(name)) {
                nameIndex.set(name, []);
            }
            nameIndex.get(name).push(id);
        });
    };
    updateNameIndex(state);
    const parentIndex = new Map();
    const updateParentIndex = (state) => {
        parentIndex.clear();
        state.forEach((node, id) => {
            if (!node.parent)
                return;
            if (!parentIndex.has(node.parent)) {
                parentIndex.set(node.parent, []);
            }
            parentIndex.get(node.parent).push(id);
        });
    };
    updateParentIndex(state);
    return state;
}
async function performDatabaseOperations(state, key) {
    console.log("Performing database operations...");
    const keyUtf8 = new TextEncoder().encode(key);
    // Store and retrieve from IPFS
    const hash = await (0, db_1.storeDatabase)(state, keyUtf8);
    console.log("Database stored with hash:", hash);
    const retrievedJson = await (0, db_1.retrieveDatabase)(hash, keyUtf8);
    console.log("Database retrieved:", await retrievedJson);
    return hash;
}
async function addFileAndStore(hash, key) {
    const keyUtf8 = new TextEncoder().encode(key);
    const node = await (0, db_1.retrieveDatabase)(hash, keyUtf8);
    let state = initializeDatabase();
    state = (0, db_1.addNode)(state, JSON.parse(node));
    console.log("Unpin File IPFS", await (0, pinataAPI_1.unpinFromIPFS)(hash));
    const file = {
        id: "2",
        type: "FILE",
        name: "my-file",
        content: "testFile",
        children: [],
        parent: "1",
    };
    state = (0, db_1.addNode)(state, file);
    console.log("Sample nodes added", Array.from(state.values()));
    const newHash = await (0, db_1.storeDatabase)(state, keyUtf8);
    return newHash;
}
function queryDatabase(state) {
    console.log("Querying database...");
    const nameQuery = (name) => (node) => node.name === name;
    const typeQuery = (type) => (node) => node.type === type;
    const contentQuery = (content) => (node) => node.content === content;
    const childrenQuery = (children) => (node) => Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
    const parentQuery = (parent) => (node) => node.parent === parent;
    const allNodes = (0, db_1.getAllNodes)(state);
    console.log("Nodes with name", (0, db_1.query)(state, nameQuery("my-node")));
    console.log("Nodes with type", (0, db_1.query)(state, typeQuery("FILE")));
    console.log("Nodes with type", (0, db_1.query)(state, typeQuery("DIRECTORY")));
    console.log("Nodes with content This is my file", (0, db_1.query)(state, contentQuery("This is my file")));
    console.log("Nodes with content This is another file", (0, db_1.query)(state, contentQuery("This is another file")));
    console.log("Nodes with content testDir", (0, db_1.query)(state, contentQuery("testDir")));
    console.log("Nodes with children", (0, db_1.query)(state, childrenQuery(["3"])));
    console.log("Nodes with parent", (0, db_1.query)(state, parentQuery("1")));
    console.log("All nodes", allNodes);
}
async function serializeAndDeserializeDatabase(state, key) {
    console.log("Serializing and deserializing database...");
    const keyUtf8 = new TextEncoder().encode(key);
    const serialized = (0, db_1.serializeDatabase)(state, keyUtf8);
    console.log("Serialized:", serialized);
    const deserialized = (0, db_1.deserializeDatabase)(serialized, keyUtf8);
    console.log("Deserialized:", deserialized);
}
async function addFileToDirectory(state) {
    console.log("Adding a file to an existing directory...");
    // Creiamo un nuovo file con l'ID "2" e impostiamo il suo parent alla directory con ID "1"
    const newFile = {
        id: "2",
        type: "FILE",
        name: "my-file",
        content: "This is my file",
        parent: "1",
        children: [],
    };
    // Aggiungiamo il nuovo file allo state
    state = (0, db_1.addNode)(state, newFile);
    // Ora dobbiamo aggiornare la lista dei children della directory
    const parentDir = (0, db_1.getNode)(state, "1");
    if (parentDir && Array.isArray(parentDir.children)) {
        parentDir.children.push("2");
        state = (0, db_1.updateNode)(state, parentDir);
    }
    console.log("File added to directory", Array.from(state.values()));
    return state;
}
async function addAnotherFileAndList(state) {
    console.log("Adding another file to the existing directory...");
    // Creiamo un altro nuovo file con l'ID "3" e impostiamo il suo parent alla directory con ID "1"
    const anotherFile = {
        id: "3",
        type: "FILE",
        name: "another-file",
        content: "This is another file",
        parent: "1",
        children: [],
    };
    // Aggiungiamo il nuovo file allo state
    state = (0, db_1.addNode)(state, anotherFile);
    // Ora dobbiamo aggiornare la lista dei children della directory
    const parentDir = (0, db_1.getNode)(state, "1");
    if (parentDir && Array.isArray(parentDir.children)) {
        parentDir.children.push("3");
        state = (0, db_1.updateNode)(state, parentDir);
    }
    console.log("Another file added to directory", Array.from(state.values()));
    // Ora listiamo tutti i file nella directory con l'ID "1"
    const filesInDir = (0, db_1.getChildren)(state, "1").filter(node => (node === null || node === void 0 ? void 0 : node.type) === "FILE");
    console.log("Files in directory:", filesInDir);
    return state;
}
// Main function to kick off the execution
function main() {
    const go = async () => {
        try {
            await run();
        }
        catch (err) {
            console.error(err);
        }
    };
    go();
}
main();
