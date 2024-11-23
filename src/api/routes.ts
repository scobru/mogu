import express, { Router, Request, Response } from "express";
import { GunMogu } from "../db/gunDb";
import { NodeType, EncryptedNode } from "../db/types";
import { 
  unpinFromIPFS,
  setCredentials 
} from "../ipfs/pinataAPI";
import {
  updateNode,
  removeNode,
  storeDatabase,
  retrieveDatabase,
  serializeDatabase,
  query,
  getAllNodes
} from "../db/db";

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
      state.set(node.id, node);
      
      res.send({ message: "nodeAdded", params: node });
    } catch (error) {
      res.status(500).send({ error: "Failed to add node" });
    }
  });

  router.post("/updateNode", async (req: Request, res: Response) => {
    try {
      const node = req.body as EncryptedNode;
      await gunDb.updateNode(node);
      state = updateNode(state, node);
      res.send({ message: "nodeUpdated", params: node });
    } catch (error) {
      res.status(500).send({ error: "Failed to update node" });
    }
  });

  router.post("/removeNode", async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      await gunDb.removeNode(id);
      state = removeNode(state, id);
      res.send({ message: "nodeRemoved", params: { id } });
    } catch (error) {
      res.status(500).send({ error: "Failed to remove node" });
    }
  });

  router.get("/getAllNodes", async (req: Request, res: Response) => {
    try {
      const nodes = getAllNodes(state);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to get nodes" });
    }
  });

  router.post("/queryByName", async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const nodes = query(state, node => node.name === name);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to query nodes" });
    }
  });

  router.post("/queryByType", async (req: Request, res: Response) => {
    try {
      const { type } = req.body;
      const nodes = query(state, node => node.type === type);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to query nodes" });
    }
  });

  router.post("/queryByContent", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      const nodes = query(state, node => String(node.content) === content);
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to query nodes" });
    }
  });

  router.post("/save", async (req: Request, res: Response) => {
    try {
      const hash = await storeDatabase(state);
      res.send({ hash });
    } catch (error) {
      res.status(500).send({ error: "Failed to save state" });
    }
  });

  router.post("/load/:hash", async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;
      const nodes = await retrieveDatabase(hash);
      state = new Map(nodes.map(node => [node.id, node]));
      res.send(nodes);
    } catch (error) {
      res.status(500).send({ error: "Failed to load state" });
    }
  });

  router.post("/serialize", async (req: Request, res: Response) => {
    try {
      const serialized = await serializeDatabase(state);
      res.send(serialized);
    } catch (error) {
      res.status(500).send({ error: "Failed to serialize state" });
    }
  });

  return router;
}; 