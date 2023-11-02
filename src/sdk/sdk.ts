import { pinJSONToIPFS, unpinFromIPFS, fetchFromIPFS } from "../ipfs/pinataAPI";
import { ethers } from "ethers";
import {
  Node,
  NodeType,
  addNode,
  removeNode,
  updateNode,
  getNode,
  getChildren,
  query,
  storeDatabase,
  retrieveDatabase,
  getAllNodes,
  serializeDatabase,
  deserializeDatabase,
} from "../core/db";
import { setCredentials } from "../ipfs/pinataAPI";

type Query = (node: Node) => boolean;

const nameQuery = (name: string) => (node: Node) => node.name === name;

const typeQuery = (type: NodeType) => (node: Node) => node.type === type;

const contentQuery = (content: string) => (node: Node) => node.content === content;

const childrenQuery = (children: string[]) => (node: any) =>
  Array.isArray(node.children) && children.every(childId => node.children.includes(childId));

const parentQuery = (parent: string) => (node: Node) => node.parent === parent;

export class Mugu {
  private state: Map<string, Node>;
  private key: Uint8Array;

  constructor(initialState?: Map<string, Node>, key?: string, pinataApiKey?: string, pinataApiSecret?: string) {
    this.state = initialState == null ? initialState || new Map() : this.initializeDatabase();
    if (key && key?.length > 32) {
      key = key.substring(0, 32);
    } else if (key && key.length < 32) {
      key = key.padEnd(32, "0");
    }
    const keyUint8Array = new TextEncoder().encode(key);
    this.key = keyUint8Array;
    setCredentials(String(pinataApiKey), String(pinataApiSecret));
  }

  initializeDatabase(): Map<string, Node> {
    console.log("Initializing database...");
    return new Map<string, Node>();
  }

  serialize() {
    const serialized = serializeDatabase(this.state, this.key);
    console.log("Serialized:", serialized);
  }

  deserialize(json: string) {
    const deserialized = deserializeDatabase(json, this.key);
    console.log("Deserialized:", deserialized);
  }

  async store() {
    // Store and retrieve from IPFS
    const hash = await storeDatabase(this.state, this.key);
    console.log("Database stored with hash:", hash);
    return hash;
  }

  async retrieve(hash: string) {
    const retrieved = await retrieveDatabase(hash, this.key);
    console.log("Retrieved:", retrieved);
    return retrieved;
  }

  addNode(node: Node) {
    const state = addNode(this.state, node);
    this.state = state;
  }

  removeNode(id: string) {
    return removeNode(this.state, id);
  }

  getNode(id: string) {
    return this.state.get(id);
  }

  getAllNodes(): Node[] {
    return Array.from(this.state.values());
  }

  getParent(id: string) {
    const node = this.state.get(id);
    if (node && node.parent) {
      return this.state.get(node.parent);
    }
    return null;
  }

  updateNode(node: Node) {
    this.state.set(node.id, node);
  }

  getChildren(id: string) {
    const node = this.state.get(id);
    if (!node || !node.children) return [];
    return node.children.map(childId => this.state.get(childId)).filter(Boolean);
  }

  query(predicate: Query) {
    const nodes = this.getAllNodes();
    return nodes.filter(predicate);
  }

  async pin() {
    const hash = await this.store();
    await pinJSONToIPFS(hash);
  }

  async unpin(hash: string) {
    await unpinFromIPFS(hash);
  }

  queryByName(name: string) {
    return this.query(nameQuery(name));
  }

  queryByType(type: NodeType) {
    return this.query(typeQuery(type));
  }

  queryByContent(content: string) {
    return this.query(contentQuery(content));
  }

  queryByChildren(children: string[]) {
    return this.query(childrenQuery(children));
  }

  queryByParent(parent: string) {
    return this.query(parentQuery(parent));
  }
}

export class MuguOnChain extends Mugu {
  private contract: ethers.Contract;
  private abi: any[] = [
    "event CIDRegistered(address indexed owner, string cid)",
    "function registerCID(string memory _cid) public",
    "function getCID(address _owner) public view returns (string)",
  ];

  constructor(contractAddress: string, signer: ethers.Signer, initialState?: Map<string, Node>, key?: string) {
    super(initialState, key as string);
    this.contract = new ethers.Contract(contractAddress, this.abi, signer).connect(signer);
  }

  async registerCIDOnChain() {
    const hash = await this.store(); // Questo è il metodo store della classe padre (NodeDatabase)
    const tx = await this.contract.registerCID(hash);
    await tx.wait();
  }

  // Se desideri anche un metodo per ottenere il CID corrente dal contratto:
  async getCurrentCIDFromChain(): Promise<string> {
    const cidBytes = await this.contract.cid();
    return ethers.utils.toUtf8String(cidBytes);
  }
}
