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
const router = (0, express_1.Router)();
const nameQuery = (name) => (node) => node.name === name;
const typeQuery = (type) => (node) => node.type === type;
const contentQuery = (content) => (node) => node.content === content;
const childrenQuery = (children) => (node) => Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent) => (node) => node.parent === parent;
let state = new Map();
// Endpoint per aggiungere un nodo
router.post("/unPinCID/:cid", async (req, res) => {
    const { cid } = req.params;
    const result = await (0, pinataAPI_1.unpinFromIPFS)(cid);
    res.status(200).send({ result });
});
router.post("/addNode", async (req, res) => {
    const node = req.body;
    state = (0, db_1.addNode)(state, node);
    res.send(JSON.stringify({ message: "nodeAdded", params: JSON.stringify(node) }));
});
router.post("/updateNode", async (req, res) => {
    try {
        const node = req.body;
        state = (0, db_1.updateNode)(state, node); // Re-assigning state
        res.send(JSON.stringify({ message: "nodeAdded", params: JSON.stringify(node) }));
    }
    catch (e) {
        console.log(e);
    }
});
// Endpoint per rimuovere un nodo
router.post("/removeNode", (req, res) => {
    const id = req.body.id;
    (0, db_1.removeNode)(state, id);
    res.send(JSON.stringify({
        message: "nodeRemoved",
        params: { state },
    }));
});
// Endpoint per salvare lo stato attuale su IPFS
router.post("/save", async (req, res) => {
    // Hash the key string
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(req.body.key));
    let key;
    if (hashedKey && (hashedKey === null || hashedKey === void 0 ? void 0 : hashedKey.length) > 32) {
        key = hashedKey.substring(0, 32);
        console.log("Key truncated to 32 characters:", key);
    }
    else if (hashedKey && hashedKey.length < 32) {
        key = hashedKey.padEnd(32, "0");
        console.log("Key padded to 32 characters:", key);
    }
    const keyUint8Array = new TextEncoder().encode(key);
    const hash = await (0, db_1.storeDatabase)(state, keyUint8Array);
    res.send(JSON.stringify({
        message: "databaseSaved",
        params: { hash },
    }));
});
router.post("/saveOnChain", async (req, res) => {
    let key = req.body.key;
    const contract = req.body.contract;
    // Ensure the key is 32 characters long
    const hashedKey = ethers_1.ethers.utils.keccak256((0, utils_1.toUtf8Bytes)(key));
    if (hashedKey && (hashedKey === null || hashedKey === void 0 ? void 0 : hashedKey.length) > 32) {
        key = hashedKey.substring(0, 32);
        console.log("Key truncated to 32 characters:", key);
    }
    else if (hashedKey && hashedKey.length < 32) {
        key = hashedKey.padEnd(32, "0");
        console.log("Key padded to 32 characters:", key);
    }
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
    if (hashedKey && (hashedKey === null || hashedKey === void 0 ? void 0 : hashedKey.length) > 32) {
        key = hashedKey.substring(0, 32);
        console.log("Key truncated to 32 characters:", key);
    }
    else if (hashedKey && hashedKey.length < 32) {
        key = hashedKey.padEnd(32, "0");
        console.log("Key padded to 32 characters:", key);
    }
    const keyUint8Array = new TextEncoder().encode(key);
    const json = await (0, pinataAPI_1.fetchFromIPFS)(cid);
    const result = await (0, db_1.deserializeDatabase)(JSON.stringify(json), keyUint8Array);
    console.log("Deserialized:", result);
    state = result;
    if (result) {
        res.send({
            message: "databaseLoaded",
            params: [...result.values()],
        });
    }
    else {
        res.status(500).send({
            message: "Failed to load database",
        });
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
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api", router);
app.listen(3001, () => {
    console.log("Server running on http://localhost:3000");
});
