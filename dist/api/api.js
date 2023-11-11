"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const db_1 = require("../db/db"); // Assumendo che queste funzioni vengano dal tuo db.ts
const pinataAPI_1 = require("../ipfs/pinataAPI");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const morgan = require('morgan');
const router = (0, express_1.Router)();
const nameQuery = (name) => (node) => node.name === name;
const typeQuery = (type) => (node) => node.type === type;
const contentQuery = (content) => (node) => node.content === content;
const childrenQuery = (children) => (node) => Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent) => (node) => node.parent === parent;
let state = new Map();
router.post("/unPinCID/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        const result = await (0, pinataAPI_1.unpinFromIPFS)(cid);
        res.status(200).send({ result });
    }
    catch (error) {
        res.status(500).send({ error: error });
    }
});
router.post("/addNode", async (req, res) => {
    const node = req.body;
    console.log("Received node for adding:", node);
    if (!node || !node.id || !node.type) {
        // Aggiungi qui ulteriori controlli se necessario
        res.status(400).send({ error: "Invalid node data" });
        return;
    }
    state = (0, db_1.addNode)(state, node);
    res.send({ message: "nodeAdded", params: node });
});
router.post("/updateNode", async (req, res) => {
    const node = req.body;
    console.log("Received node for updating:", node);
    try {
        const node = req.body;
        if (!node || !node.id || !node.type || typeof node.id !== 'string') {
            res.status(400).send({ error: "Invalid node data" });
            return;
        }
        console.log("Attempting to update node with ID:", node.id);
        console.log("Current state:", state);
        if (!state.has(node.id)) {
            console.log("Node with ID not found in state:", node.id);
            res.status(404).send({ error: "Node not found" });
            return;
        }
        state = (0, db_1.updateNode)(state, node); // Ensure the global state is updated
        console.log("State updated:", state);
        res.send({ message: "nodeUpdated", params: node });
    }
    catch (e) {
        res.status(500).send({ error: e });
    }
});
router.post("/removeNode", (req, res) => {
    const id = req.body.id;
    (0, db_1.removeNode)(state, id);
    res.send(JSON.stringify({
        message: "nodeRemoved",
        params: { state },
    }));
});
router.post("/save", async (req, res) => {
    // Hash the key string
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(req.body.key));
    let key;
    key = processKey(hashedKey);
    const keyUint8Array = new TextEncoder().encode(key);
    console.log("Current state before serialization:", state);
    const hash = await (0, db_1.storeDatabase)(state, keyUint8Array);
    res.send({ message: "databaseSaved", params: { hash } });
});
router.post("/saveOnChain", async (req, res) => {
    let key = req.body.key;
    const contract = req.body.contract;
    // Ensure the key is 32 characters long
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
    key = processKey(hashedKey);
    const keyUint8Array = new TextEncoder().encode(key);
    const hash = await (0, db_1.storeOnChain)(state, keyUint8Array, contract);
    res.send(JSON.stringify({
        message: "databaseSaved",
        params: { hash },
    }));
});
router.post("/loadOnChain", async (req, res) => {
    let contract = req.body.contract;
    const hash = await (0, db_1.getCidOnChain)(contract);
    res.send(JSON.stringify({
        message: "databaseSaved",
        params: { hash },
    }));
});
router.post("/load/:cid", async (req, res) => {
    const { cid } = req.params;
    let key = req.body.key;
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
    key = processKey(hashedKey);
    const keyUint8Array = new TextEncoder().encode(key);
    const newState = await (0, db_1.retrieveDatabase)(cid, keyUint8Array);
    if (newState) {
        state = new Map(newState.map(node => [node.id, node]));
        console.log("State updated after loading:", state);
        res.send({ message: "databaseLoaded", params: [...state.values()] });
    }
    else {
        res.status(500).send({ message: "Failed to load database" });
    }
});
router.post("/serialize", async (req, res) => {
    let key = req.body.key;
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
    key = processKey(hashedKey);
    const keyUint8Array = new TextEncoder().encode(key);
    const serializedState = (0, db_1.serializeDatabase)(state, keyUint8Array);
    if (serializedState) {
        res.send({ message: "databaseSerialized", params: serializedState });
    }
    else {
        res.status(500).send({ message: "Failed to serialize database" });
    }
});
router.post("/queryByName", (req, res) => {
    const { name } = req.body;
    const result = (0, db_1.query)(state, nameQuery(name));
    res.status(200).send({ result });
});
router.post("/queryByType", (req, res) => {
    const { type } = req.body;
    const result = (0, db_1.query)(state, typeQuery(type));
    res.status(200).send({ result });
});
router.post("/queryByContent", (req, res) => {
    const { content } = req.body;
    const result = (0, db_1.query)(state, contentQuery(content));
    res.status(200).send({ result });
});
router.post("/queryByChildren", (req, res) => {
    const { children } = req.body;
    const result = (0, db_1.query)(state, childrenQuery(children));
    res.status(200).send({ result });
});
router.post("/queryByParent", (req, res) => {
    const { parent } = req.body;
    const result = (0, db_1.query)(state, parentQuery(parent));
    res.status(200).send({ result });
});
router.get("/getAllNodes", (req, res) => {
    const result = (0, db_1.getAllNodes)(state);
    res.status(200).send({ result });
});
function processKey(key) {
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
    if (hashedKey.length > 32) {
        return hashedKey.substring(0, 32);
    }
    else {
        return hashedKey.padEnd(32, '0');
    }
}
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(morgan('combined'));
app.use("/api", router);
app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});
