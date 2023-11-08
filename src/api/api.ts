import express, { Router, Request, Response } from "express";
import {
  EncryptedNode,
  addNode,
  removeNode,
  storeDatabase,
  updateNode,
  query,
  getAllNodes,
  NodeType,
  deserializeDatabase,
  storeOnChain,
  getCidOnChain,
} from "../db/db"; // Assumendo che queste funzioni vengano dal tuo db.ts
import { fetchFromIPFS, unpinFromIPFS } from "../ipfs/pinataAPI";
import { ethers } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";

const router = Router();
const nameQuery = (name: string) => (node: EncryptedNode) => node.name === name;
const typeQuery = (type: NodeType) => (node: EncryptedNode) => node.type === type;
const contentQuery = (content: string) => (node: EncryptedNode) => node.content === content;
const childrenQuery = (children: string[]) => (node: any) =>
  Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent: string) => (node: EncryptedNode) => node.parent === parent;

let state = new Map<string, EncryptedNode>();

// Endpoint per aggiungere un nodo
router.post("/unPinCID/:cid", async (req: Request, res: Response) => {
  const { cid } = req.params;
  const result = await unpinFromIPFS(cid);
  res.status(200).send({ result });
});

router.post("/addNode", async (req: Request, res: Response) => {
  const node = req.body as EncryptedNode;
  state = addNode(state, node);
  res.send(JSON.stringify({ message: "nodeAdded", params: JSON.stringify(node) }));
});

router.post("/updateNode", async (req: Request, res: Response) => {
  try {
    const node = req.body as EncryptedNode;
    state = updateNode(state, node); // Re-assigning state
    res.send(JSON.stringify({ message: "nodeAdded", params: JSON.stringify(node) }));
  } catch (e) {
    console.log(e);
  }
});

// Endpoint per rimuovere un nodo

router.post("/removeNode", (req: Request, res: Response) => {
  const id = req.body.id as string;
  removeNode(state, id);
  res.send(
    JSON.stringify({
      message: "nodeRemoved",
      params: { state },
    }),
  );
});

// Endpoint per salvare lo stato attuale su IPFS
router.post("/save", async (req: Request, res: Response) => {
  // Hash the key string
  const hashedKey = ethers.utils.keccak256(toUtf8Bytes(req.body.key as string));
  let key;

  if (hashedKey && hashedKey?.length > 32) {
    key = hashedKey.substring(0, 32);
    console.log("Key truncated to 32 characters:", key);
  } else if (hashedKey && hashedKey.length < 32) {
    key = hashedKey.padEnd(32, "0");
    console.log("Key padded to 32 characters:", key);
  }

  const keyUint8Array = new TextEncoder().encode(key);
  const hash = await storeDatabase(state, keyUint8Array);

  res.send(
    JSON.stringify({
      message: "databaseSaved",
      params: { hash },
    }),
  );
});

router.post("/saveOnChain", async (req: Request, res: Response) => {
  let key = req.body.key as string;
  const contract = req.body.contract as string;
  // Ensure the key is 32 characters long
  const hashedKey = ethers.utils.keccak256(toUtf8Bytes(key as string));

  if (hashedKey && hashedKey?.length > 32) {
    key = hashedKey.substring(0, 32);
    console.log("Key truncated to 32 characters:", key);
  } else if (hashedKey && hashedKey.length < 32) {
    key = hashedKey.padEnd(32, "0");
    console.log("Key padded to 32 characters:", key);
  }

  const keyUint8Array = new TextEncoder().encode(key);
  const hash = await storeOnChain(state, keyUint8Array, contract);

  res.send(
    JSON.stringify({
      message: "databaseSaved",
      params: { hash },
    }),
  );
});

router.post("/loadOnChain", async (req: Request, res: Response) => {
  let contract = req.body.contract as string;
  const hash = await getCidOnChain(contract);

  res.send(
    JSON.stringify({
      message: "databaseSaved",
      params: { hash },
    }),
  );
});

router.post("/load/:cid", async (req: Request, res: Response) => {
  const { cid } = req.params;
  let key = req.body.key as string;
  const hashedKey = ethers.utils.keccak256(toUtf8Bytes(key as string));

  if (hashedKey && hashedKey?.length > 32) {
    key = hashedKey.substring(0, 32);
    console.log("Key truncated to 32 characters:", key);
  } else if (hashedKey && hashedKey.length < 32) {
    key = hashedKey.padEnd(32, "0");
    console.log("Key padded to 32 characters:", key);
  }

  const keyUint8Array = new TextEncoder().encode(key);
  const json = await fetchFromIPFS(cid);
  const result = await deserializeDatabase(JSON.stringify(json), keyUint8Array);
  console.log("Deserialized:", result);

  state = result as any;

  if (result) {
    res.send({
      message: "databaseLoaded",
      params: [...result.values()],
    });
  } else {
    res.status(500).send({
      message: "Failed to load database",
    });
  }
});

router.post("/queryByName", (req: Request, res: Response) => {
  const { name } = req.body;
  const result = query(state, nameQuery(name));
  res.status(200).send({ result });
});

router.post("/queryByType", (req: Request, res: Response) => {
  const { type } = req.body;
  const result = query(state, typeQuery(type));
  res.status(200).send({ result });
});

router.post("/queryByContent", (req: Request, res: Response) => {
  const { content } = req.body;
  const result = query(state, contentQuery(content));
  res.status(200).send({ result });
});

router.post("/queryByChildren", (req: Request, res: Response) => {
  const { children } = req.body;
  const result = query(state, childrenQuery(children));
  res.status(200).send({ result });
});

router.post("/queryByParent", (req: Request, res: Response) => {
  const { parent } = req.body;
  const result = query(state, parentQuery(parent));
  res.status(200).send({ result });
});

router.get("/getAllNodes", (req: Request, res: Response) => {
  const result = getAllNodes(state);
  res.status(200).send({ result });
});

const app = express();

app.use(express.json());
app.use("/api", router);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3000");
});
