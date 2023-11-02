import { pinJSONToIPFS, unpinFromIPFS, fetchFromIPFS } from "../ipfs/pinataAPI";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import MecenateHelper from "@scobru/crypto-ipfs";
import { ethers } from "ethers";

export type NodeType = "FILE" | "DIRECTORY";

export type Node = {
  id: string;
  type: NodeType;
  name: string;
  parent?: string;
  children?: string[];
  content?: string;
};

export type EncryptedNode = {
  id: string;
  type: NodeType;
  name: string;
  parent?: string;
  children?: string[];
  content?: Uint8Array;
  encrypted?: boolean;
};

type Query = (node: Node) => boolean;

export const serializeDatabase = (state: Map<string, Node>, key: Uint8Array) => {
  const nodes = Array.from(state.values());
  const nonce = MecenateHelper.crypto.asymmetric.generateNonce();
  const noncePath = join(__dirname, "nonces.json");
  writeFileSync(noncePath, JSON.stringify({ nonce: Buffer.from(nonce).toString("hex") }));

  const encryptedNodes = nodes.map(node => ({
    ...node,
    content: node.content
      ? MecenateHelper.crypto.asymmetric.secretBox.encryptMessage(node.content, nonce, key)
      : undefined,
    encrypted: true,
  }));
  const json = JSON.stringify(encryptedNodes);

  return json;
};

function objectToUint8Array(obj: any): Uint8Array {
  const arr: any = Object.values(obj);
  return new Uint8Array(arr);
}

export const deserializeDatabase = async (json: string, key: Uint8Array) => {
  if (typeof key === "string") {
    key = Buffer.from(key, "hex");
  } else if (!(key instanceof Uint8Array)) {
    throw new Error("Invalid key type");
    return;
  }

  // Recupera il nonce dal file JSON localmente
  const noncePath = join(__dirname, "nonces.json");
  const storedNonce = JSON.parse(readFileSync(noncePath, "utf-8"));
  const nonce = Buffer.from(storedNonce.nonce, "hex");
  const encryptedNodes = JSON.parse(json) as EncryptedNode[];
  const nodes = await Promise.all(
    encryptedNodes.map(async node => {
      let content = node.content;
      if (node.encrypted) {
        if (content && typeof content === "object" && !Array.isArray(content)) {
          content = objectToUint8Array(content);
        }

        if (content === undefined) {
          console.error("Content is undefined for node:", node);
          content = new Uint8Array();
        } else {
          content = await MecenateHelper.crypto.asymmetric.secretBox.decryptMessage(content as Uint8Array, nonce, key);
        }
      }
      return {
        ...node,
        content,
      };
    }),
  );

  const state = new Map<string, Node>();

  if (nodes) {
    nodes.forEach((node: any) => {
      if (node) {
        state.set(node.id, node);
      } else {
        console.log("Undefined node found");
      }
    });
    return state;
  } else {
    console.log("No nodes found");
  }
};

export const storeDatabase = async (state: Map<string, Node>, key: Uint8Array) => {
  const json = serializeDatabase(state, key);
  //const buffer = Buffer.from(json);
  const hash = await pinJSONToIPFS(JSON.parse(json));
  return hash;
};

export const retrieveDatabase = async (hash: string, key: Uint8Array) => {
  const json = await fetchFromIPFS(hash);
  const state = deserializeDatabase(json, key);

  return state;
};

export const addNode = (state: Map<string, Node>, node: Node) => {
  const newState = new Map(state);

  // Aggiungi il nodo allo stato
  newState.set(node.id, node);

  // Se il nodo ha un genitore, aggiungi questo nodo all'elenco dei figli del genitore
  if (node.parent) {
    const parent = newState.get(node.parent);
    if (parent && parent.children) {
      parent.children.push(node.id);
      newState.set(node.parent, parent); // Aggiorna il nodo genitore nello stato
    }
  }

  return newState;
};

export const removeNode = (state: Map<string, Node>, id: string) => {
  const newState = new Map(state);

  // Rimuovi il nodo dallo stato
  const node = newState.get(id);
  newState.delete(id);

  if (node && node.parent) {
    const parent = newState.get(node.parent);
    if (parent && parent.children) {
      const index = parent.children.indexOf(id);
      if (index > -1) {
        parent.children.splice(index, 1);
        newState.set(node.parent, parent); // Aggiorna il nodo genitore nello stato
      }
    }
  }

  return newState;
};

export const getNode = (state: Map<string, Node>, id: string) => {
  return state.get(id);
};

export const getAllNodes = (state: Map<string, Node>): Node[] => {
  return Array.from(state.values());
};

export const getParent = (state: Map<string, Node>, id: string) => {
  const node = state.get(id);
  if (node && node.parent) {
    return state.get(node.parent);
  }
  return null;
};

export const updateNode = (state: Map<string, Node>, node: Node) => {
  return new Map(state).set(node.id, node);
};

export const getChildren = (state: Map<string, Node>, id: string) => {
  const node = state.get(id);
  if (!node || !node.children) return [];
  return node.children.map(childId => state.get(childId)).filter(Boolean);
};

export const query = (state: Map<string, Node>, predicate: Query) => {
  const nodes = Array.from(state.values());
  const matches = nodes.filter(predicate);
  return matches;
};

export const storeOnChain = async (state: Map<string, Node>, key: Uint8Array, contract: any) => {
  const abi: any[] = [
    "event CIDRegistered(string cid)",
    "function registerCID(string memory cidNew) public",
    "function getCID() public view returns (string memory)",
  ];

  const signer = new ethers.Wallet(
    process.env.PRIVATE_KEY as string,
    new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL),
  );

  const instance = new ethers.Contract(contract, abi, signer).connect(signer);
  const json = serializeDatabase(state, key);
  const hash = await pinJSONToIPFS(JSON.parse(json));
  const tx = await instance.registerCID(ethers.utils.toUtf8Bytes(hash));
  await tx.wait();
  return hash;
};

export const getCidOnChain = async (contract: any) => {
  const abi: any[] = [
    "event CIDRegistered(string cid)",
    "function registerCID(string memory cidNew) public",
    "function getCID() public view returns (string memory)",
  ];

  const signer = new ethers.Wallet(
    process.env.PRIVATE_KEY as string,
    new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL),
  );
  const instance = new ethers.Contract(contract, abi, signer).connect(signer);
  const cidBytes = await instance.getCID();
  return ethers.utils.toUtf8String(cidBytes);
};
