import express, { Router, Request, Response } from "express";
import {
  Node,
  addNode,
  removeNode,
  storeDatabase,
  retrieveDatabase,
  updateNode,
  query,
  getAllNodes,
  getNode,
  NodeType,
  deserializeDatabase,
  serializeDatabase,
  storeOnChain,
  getCidOnChain,
} from "../core/db"; // Assumendo che queste funzioni vengano dal tuo db.ts
import { fetchFromIPFS, unpinFromIPFS } from "../ipfs/pinataAPI";

const router = Router();

const nameQuery = (name: string) => (node: Node) => node.name === name;

const typeQuery = (type: NodeType) => (node: Node) => node.type === type;

const contentQuery = (content: string) => (node: Node) => node.content === content;

const childrenQuery = (children: string[]) => (node: any) =>
  Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent: string) => (node: Node) => node.parent === parent;

let state = new Map<string, Node>();

// Endpoint per aggiungere un nodo
router.post("/unPinCID/:cid", async (req: Request, res: Response) => {
  const { cid } = req.params;
  const result = await unpinFromIPFS(cid);
  res.status(200).send({ result });
});

router.post("/addNode", async (req: Request, res: Response) => {
  const node = req.body as Node;
  state = addNode(state, node);
  res.send(JSON.stringify({ message: "nodeAdded", params: JSON.stringify(node) }));
});

router.post("/updateNode", async (req: Request, res: Response) => {
  try {
    const node = req.body as Node;
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
  let key = req.body.key as string;

  // Ensure the key is 32 characters long
  if (key.length > 32) {
    key = key.substring(0, 32);
  } else if (key.length < 32) {
    key = key.padEnd(32, "0");
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
  let contract = req.body.contract as string;

  // Ensure the key is 32 characters long
  if (key.length > 32) {
    key = key.substring(0, 32);
  } else if (key.length < 32) {
    key = key.padEnd(32, "0");
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

  // Ensure the key is 32 characters long
  if (key.length > 32) {
    key = key.substring(0, 32);
  } else if (key.length < 32) {
    key = key.padEnd(32, "0");
  }

  const keyUint8Array = new TextEncoder().encode(key);

  const json = await fetchFromIPFS(cid); // Assumendo che fetchFromIPFS restituisca i dati come stringa JSON

  const result = await deserializeDatabase(JSON.stringify(json), keyUint8Array);
  if (result instanceof Map) {
    state = new Map<string, Node>(result);

    res.send({
      message: "databaseLoaded",
      params: [...state.values()],
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
