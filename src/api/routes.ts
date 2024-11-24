import express, { Router, Request, Response } from "express";
import { GunMogu } from "../db/gunDb";
import { NodeType, EncryptedNode } from "../db/types";

export const createRouter = (gunDb: GunMogu) => {
  const router = Router();
  let state = new Map<string, EncryptedNode>();

  // Rotte semplificate
  router.post("/addNode", async (req: Request, res: Response) => {
    try {
      const node = req.body as EncryptedNode;
      
      if (!node || !node.id || !node.type) {
        res.status(400).send({ error: "Invalid node data" });
        return;
      }

      await gunDb.addNode(node);
      state = gunDb.getState();
      
      res.send({ message: "nodeAdded", params: node });
    } catch (error) {
      res.status(500).send({ error: "Failed to add node" });
    }
  });

  router.post("/updateNode", async (req: Request, res: Response) => {
    try {
      const node = req.body as EncryptedNode;
      await gunDb.updateNode(node);
      state = gunDb.getState();
      res.send({ message: "nodeUpdated", params: node });
    } catch (error) {
      res.status(500).send({ error: "Failed to update node" });
    }
  });

  router.post("/removeNode", async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      await gunDb.removeNode(id);
      state = gunDb.getState();
      res.send({ message: "nodeRemoved", params: { id } });
    } catch (error) {
      res.status(500).send({ error: "Failed to remove node" });
    }
  });

  router.get("/getAllNodes", async (req: Request, res: Response) => {
    try {
      const nodes = Array.from(gunDb.getState().values());
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to get nodes" });
    }
  });

  router.post("/queryByName", async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const nodes = await gunDb.queryByName(name);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to query nodes" });
    }
  });

  router.post("/queryByType", async (req: Request, res: Response) => {
    try {
      const { type } = req.body;
      const nodes = await gunDb.queryByType(type);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to query nodes" });
    }
  });

  router.post("/queryByContent", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      const nodes = await gunDb.queryByContent(content);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to query nodes" });
    }
  });

  router.post("/save", async (req: Request, res: Response) => {
    try {
      const nodes = Array.from(gunDb.getState().values());
      res.send({ nodes });
    } catch (error) {
      res.status(500).send({ error: "Failed to save state" });
    }
  });

  router.post("/load/:hash", async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;
      const nodes = await gunDb.getState();
      res.send(Array.from(nodes.values()));
    } catch (error) {
      res.status(500).send({ error: "Failed to load state" });
    }
  });

  return router;
}; 