import { pinJSONToIPFS, unpinFromIPFS, fetchFromIPFS } from "../ipfs/pinataAPI";
import { ethers } from "ethers";
import {
  NodeType,
  EncryptedNode,
  addNode,
  removeNode,
  updateNode,
  getNode,
  storeDatabaseSDK,
  retrieveDatabase,
  getAllNodes,
  deserializeDatabaseSdk,
  serializeDatabaseSdk,
} from "../db/db";
import { setCredentials } from "../ipfs/pinataAPI";

type Query = (node: EncryptedNode) => boolean;

const nameQuery = (name: string) => (node: EncryptedNode) => node.name === name;
const typeQuery = (type: NodeType) => (node: EncryptedNode) => node.type === type;
const contentQuery = (content: string) => (node: EncryptedNode) => String(node.content) === content;
const childrenQuery = (children: string[]) => (node: any) =>
  Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = (parent: string) => (node: EncryptedNode) => node.parent === parent;

export class Mogu {
  private state: Map<string, EncryptedNode>;
  private key: Uint8Array;
  private nonce: Uint8Array;

  constructor(
    initialState?: Map<string, EncryptedNode>,
    key?: string,
    nonce?: string,
    pinataApiKey?: string,
    pinataApiSecret?: string,
  ) {
    this.state = initialState == null ? initialState || new Map() : this.initializeDatabase();
    if (key && key?.length > 32) {
      key = key.substring(0, 32);
      console.log("Key truncated to 32 characters:", key);
    } else if (key && key.length < 32) {
      key = key.padEnd(32, "0");
      console.log("Key padded to 32 characters:", key);
    }
    const keyUint8Array = new TextEncoder().encode(key);
    const nonceBuffer = Buffer.from(String(nonce), "hex");
    // const nonceUint8Array = new Uint8Array(nonceBuffer);

    this.nonce = nonceBuffer;
    this.key = keyUint8Array;

    setCredentials(String(pinataApiKey), String(pinataApiSecret));
  }

  initializeDatabase(): Map<string, Node> {
    console.log("Initializing database...");
    return new Map<string, Node>();
  }

  serialize() {
    console.log("Serialize");
    const serialized = serializeDatabaseSdk(this.state, this.key, this.nonce);
    console.log("Serialized:", serialized);
    return serialized;
  }

  deserialize(json: string) {
    console.log("Deserialize");
    const deserialized = deserializeDatabaseSdk(json, this.key, this.nonce);
    console.log("Deserialized:", deserialized);
    return deserialized;
  }

  async store() {
    console.log("Store SDK");
    return await storeDatabaseSDK(this.state, this.key, this.nonce);
  }

  async retrieve(hash: string) {
    console.log("Retrieve");
    return await retrieveDatabase(hash, this.key);
  }

  async load(hash: string) {
    console.log("Load");
    const json = await fetchFromIPFS(hash);
    const deserialized = await deserializeDatabaseSdk(JSON.stringify(json), this.key, this.nonce);

    if (deserialized instanceof Map) {
      this.state = new Map<string, EncryptedNode>(deserialized);
    } else {
      console.log("Deserialized is not a Map");
    }

    console.log("Deserialized:", deserialized);
    return deserialized;
  }

  addNode(node: EncryptedNode) {
    console.log("Add Node");
    const state = addNode(this.state, node);
    this.state = state;
    return state;
  }

  removeNode(id: string) {
    return removeNode(this.state, id);
  }

  getNode(id: string) {
    console.log("Get Node");
    return getNode(this.state, id);
  }

  getAllNodes(): EncryptedNode[] {
    console.log("Get All Node");
    return getAllNodes(this.state);
  }

  getParent(id: string) {
    console.log("Get Parent");
    const node = this.state.get(id);
    if (node && node.parent) {
      return this.state.get(node.parent);
    }
    console.log("No Parent");
    return null;
  }

  updateNode(node: EncryptedNode) {
    console.log("Update Node");
    const result = updateNode(this.state, node);
    this.state = result;
    console.log("Update Complete!", result);
    return node;
  }

  getChildren(id: string) {
    console.log("Get Children");
    const node = this.state.get(id);
    if (!node || !node.children) return [];
    return node.children.map(childId => this.state.get(childId)).filter(Boolean);
  }

  query(predicate: Query) {
    console.log("Query");
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
    console.log("Query by Name");

    return this.query(nameQuery(name));
  }

  queryByType(type: NodeType) {
    console.log("Query by Type");

    return this.query(typeQuery(type));
  }

  queryByContent(content: string) {
    console.log("Query by Content");

    return this.query(contentQuery(content));
  }

  queryByChildren(children: string[]) {
    console.log("Query by Children");

    return this.query(childrenQuery(children));
  }

  queryByParent(parent: string) {
    console.log("Query by Parent");

    return this.query(parentQuery(parent));
  }
}

export class MoguOnChain extends Mogu {
  private contract: ethers.Contract;

  private abi: any[] = [
    "event CIDRegistered(string cid)",
    "function registerCID(string memory cidNew) public",
    "function getCID() public view returns (string memory)",
  ];

  constructor(contractAddress: string, signer: ethers.Signer, initialState?: Map<string, EncryptedNode>, key?: string) {
    super(initialState, key as string);
    this.contract = new ethers.Contract(contractAddress, this.abi, signer).connect(signer);
  }

  async registerCIDOnChain() {
    const hash = await this.store(); // Questo è il metodo store della classe padre (NodeDatabase)
    const tx = await this.contract.registerCID(ethers.utils.toUtf8Bytes(hash));
    await tx.wait();
  }

  // Se desideri anche un metodo per ottenere il CID corrente dal contratto:
  async getCurrentCIDFromChain(): Promise<string> {
    const cidBytes = await this.contract.cid();
    return ethers.utils.toUtf8String(cidBytes);
  }
}
