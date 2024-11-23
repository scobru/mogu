"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db/db");
const createRouter = (gunDb) => {
    const router = (0, express_1.Router)();
    let state = new Map();
    // Rotte semplificate
    router.post("/addNode", async (req, res) => {
        try {
            const node = req.body;
            if (!node || !node.id || !node.type) {
                res.status(400).send({ error: "Invalid node data" });
                return;
            }
            await gunDb.addNode(node);
            state.set(node.id, node);
            res.send({ message: "nodeAdded", params: node });
        }
        catch (error) {
            res.status(500).send({ error: "Failed to add node" });
        }
    });
    router.post("/updateNode", async (req, res) => {
        try {
            const node = req.body;
            await gunDb.updateNode(node);
            state = (0, db_1.updateNode)(state, node);
            res.send({ message: "nodeUpdated", params: node });
        }
        catch (error) {
            res.status(500).send({ error: "Failed to update node" });
        }
    });
    router.post("/removeNode", async (req, res) => {
        try {
            const { id } = req.body;
            await gunDb.removeNode(id);
            state = (0, db_1.removeNode)(state, id);
            res.send({ message: "nodeRemoved", params: { id } });
        }
        catch (error) {
            res.status(500).send({ error: "Failed to remove node" });
        }
    });
    router.get("/getAllNodes", async (req, res) => {
        try {
            const nodes = (0, db_1.getAllNodes)(state);
            res.send(nodes);
        }
        catch (error) {
            res.status(500).send({ error: "Failed to get nodes" });
        }
    });
    router.post("/queryByName", async (req, res) => {
        try {
            const { name } = req.body;
            const nodes = (0, db_1.query)(state, node => node.name === name);
            res.send(nodes);
        }
        catch (error) {
            res.status(500).send({ error: "Failed to query nodes" });
        }
    });
    router.post("/queryByType", async (req, res) => {
        try {
            const { type } = req.body;
            const nodes = (0, db_1.query)(state, node => node.type === type);
            res.send(nodes);
        }
        catch (error) {
            res.status(500).send({ error: "Failed to query nodes" });
        }
    });
    router.post("/queryByContent", async (req, res) => {
        try {
            const { content } = req.body;
            const nodes = (0, db_1.query)(state, node => String(node.content) === content);
            res.send(nodes);
        }
        catch (error) {
            res.status(500).send({ error: "Failed to query nodes" });
        }
    });
    router.post("/save", async (req, res) => {
        try {
            const hash = await (0, db_1.storeDatabase)(state);
            res.send({ hash });
        }
        catch (error) {
            res.status(500).send({ error: "Failed to save state" });
        }
    });
    router.post("/load/:hash", async (req, res) => {
        try {
            const { hash } = req.params;
            const nodes = await (0, db_1.retrieveDatabase)(hash);
            state = new Map(nodes.map(node => [node.id, node]));
            res.send(nodes);
        }
        catch (error) {
            res.status(500).send({ error: "Failed to load state" });
        }
    });
    router.post("/serialize", async (req, res) => {
        try {
            const serialized = await (0, db_1.serializeDatabase)(state);
            res.send(serialized);
        }
        catch (error) {
            res.status(500).send({ error: "Failed to serialize state" });
        }
    });
    return router;
};
exports.createRouter = createRouter;
