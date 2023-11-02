"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const db_1 = require("../core/db"); // Assumendo che queste funzioni vengano dal tuo db.ts
const pinataAPI_1 = require("../ipfs/pinataAPI");
const router = (0, express_1.Router)();
const nameQuery = name => node => node.name === name;
const typeQuery = type => node => node.type === type;
const contentQuery = content => node => node.content === content;
const childrenQuery = children => node =>
  Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = parent => node => node.parent === parent;
let state = new Map();
// Endpoint per aggiungere un nodo
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
  } catch (e) {
    console.log(e);
  }
});
// Endpoint per rimuovere un nodo
router.post("/removeNode", (req, res) => {
  const id = req.body.id;
  (0, db_1.removeNode)(state, id);
  res.send(
    JSON.stringify({
      message: "nodeRemoved",
      params: { state },
    }),
  );
});
// Endpoint per salvare lo stato attuale su IPFS
router.post("/save", async (req, res) => {
  let key = req.body.key;
  // Ensure the key is 32 characters long
  if (key.length > 32) {
    key = key.substring(0, 32);
  } else if (key.length < 32) {
    key = key.padEnd(32, "0");
  }
  const keyUint8Array = new TextEncoder().encode(key);
  const hash = await (0, db_1.storeDatabase)(state, keyUint8Array);
  res.send(
    JSON.stringify({
      message: "databaseSaved",
      params: { hash },
    }),
  );
});
router.post("/load/:cid", async (req, res) => {
  const { cid } = req.params;
  let key = req.body.key;
  // Ensure the key is 32 characters long
  if (key.length > 32) {
    key = key.substring(0, 32);
  } else if (key.length < 32) {
    key = key.padEnd(32, "0");
  }
  const keyUint8Array = new TextEncoder().encode(key);
  const json = await (0, pinataAPI_1.fetchFromIPFS)(cid); // Assumendo che fetchFromIPFS restituisca i dati come stringa JSON
  const result = await (0, db_1.deserializeDatabase)(JSON.stringify(json), keyUint8Array);
  if (result instanceof Map) {
    state = new Map(result);
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
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
