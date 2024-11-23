import { Web3Stash } from "../web3stash/index";
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { ethers } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { NodeType, EncryptedNode } from "../db/types";
import { GunMogu, GunNode } from "../db/gunDb";
import { gun } from '../server';
import { 
  serializeDatabase,
  deserializeDatabase,
  retrieveDatabase,
  removeNode,
  getAllNodes,
  updateNode 
} from '../db/db';

type Query = (node: EncryptedNode) => boolean;

const nameQuery = (name: string) => (node: EncryptedNode) => node.name === name;
const typeQuery = (type: NodeType) => (node: EncryptedNode) => node.type === type;
const contentQuery = (content: string) => (node: EncryptedNode) => String(node.content) === content;

export { EncryptedNode, NodeType };
export class Mogu {
  private gunDb: GunMogu;
  private key!: Uint8Array;
  private dbName!: string;
  private state: Map<string, EncryptedNode>;
  private storageService?: any;

  constructor(
    peers: string[] = [],
    key?: string,
    storageService?: Web3StashServices,
    storageConfig?: Web3StashConfig,
    dbName?: string
  ) {
    this.gunDb = new GunMogu(gun, peers, false, key || '');
    this.state = new Map<string, EncryptedNode>();
    this.dbName = dbName || 'default-db';
    
    if (key && key.length > 0) {
      const hashedKey = ethers.utils.keccak256(toUtf8Bytes(key));
      const processedKey = this.processKey(hashedKey);
      this.key = new TextEncoder().encode(processedKey);
    } else {
      this.key = new TextEncoder().encode('');
    }
    
    if (storageService && storageConfig) {
      this.storageService = Web3Stash(storageService, storageConfig);
    }
  }

  // Nuovi metodi GunDB
  async login(username: string, password: string) {
    return this.gunDb.authenticate(username, password);
  }

  onNodeChange(callback: (node: EncryptedNode) => void) {
    const convertToStandardNode = (gunNode: GunNode): EncryptedNode => ({
      id: gunNode.id,
      type: gunNode.type,
      name: gunNode.name,
      content: gunNode.content,
      encrypted: gunNode.encrypted
    });

    this.gunDb.subscribeToChanges((gunNode: GunNode) => {
      callback(convertToStandardNode(gunNode));
    });
  }

  async addNode(node: EncryptedNode) {
    await this.gunDb.addNode(node);
    this.state.set(node.id, node);
    return this.state;
  }

  async getNode(id: string): Promise<EncryptedNode | null> {
    const gunNode = await this.gunDb.getNode(id);
    if (gunNode) {
      this.state.set(id, gunNode);
      return gunNode;
    }
    return this.state.get(id) || null;
  }

  initializeDatabase(): Map<string, EncryptedNode> {
    console.log("Initializing database...");
    return new Map<string, EncryptedNode>();
  }

  serialize() {
    console.log("Serialize");
    const serialized = serializeDatabase(this.state);
    console.log("Serialized:", serialized);
    return serialized;
  }

  deserialize(json: string) {
    console.log("Deserialize");
    const deserialized = deserializeDatabase(json);
    console.log("Deserialized:", deserialized);
    return deserialized;
  }

  async store() {
    console.log("Store");
    try {
      const nodes = Array.from(this.state.values());
      
      if (!this.storageService) {
        throw new Error("Storage service not initialized");
      }

      const result = await this.storageService.uploadJson(nodes);
      console.log("State stored with hash:", result.id);
      return result.id;
    } catch (err) {
      console.error("Error storing state:", err);
      return undefined;
    }
  }

  isEncryptedNode(value: any): value is EncryptedNode {
    return (
      value &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      Object.values(NodeType).includes(value.type) &&
      (value.encrypted === undefined || typeof value.encrypted === "boolean")
    );
  }

  processKey(hashedKey: string): string {
    if (hashedKey.length > 32) {
      return hashedKey.substring(0, 32);
    } else {
      return hashedKey.padEnd(32, "0");
    }
  }

  async retrieve(hash: string) {
    console.log("Retrieve");
    return await retrieveDatabase(hash);
  }

  async load(hash: string) {
    console.log("Load");
    const state = await retrieveDatabase(hash);
    this.state = new Map(state.map((node: EncryptedNode) => [node.id, node]));
    return this.state;
  }

  removeNode(id: string) {
    return removeNode(this.state, id);
  }

  getAllNodes(): EncryptedNode[] {
    console.log("Get All Nodes");
    return getAllNodes(this.state);
  }

  updateNode(node: EncryptedNode) {
    console.log("Update Node");

    if (!this.state.has(node.id)) {
      console.log("Node with ID not found in state:", node.id);
      return;
    }

    this.state = updateNode(this.state, node);
    console.log("Update Complete!");
    return node;
  }

  query(predicate: Query) {
    console.log("Query");
    const nodes = this.getAllNodes();
    console.log("Nodes:", nodes);
    return nodes.filter(predicate);
  }

  async pin() {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }
    const hash = await this.store();
    if (hash) {
      await this.storageService.uploadJson({ hash });
    }
  }

  async unpin(hash: string) {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }
    await this.storageService.unpin(hash);
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

  // Metodo per accedere all'istanza Gun
  public getGun() {
    return this.gunDb.getGunInstance();
  }

  // Esempio di utilizzo del plugin chain
  async useChainPlugin() {
    const gun = this.getGun();
    // Ora puoi usare il plugin
    gun.chain.tuaFunzione();
  }

  // Wrapper per le funzionalità del plugin
  async chainOperation(path: string) {
    const gun = this.getGun();
    const result = await gun.chain.operation(path);
    
    // Converti il risultato nel formato Mogu
    const node: EncryptedNode = {
      id: path,
      type: NodeType.NODE,
      name: result.name,
      content: result.data
    };

    // Aggiorna lo stato interno
    this.state.set(node.id, node);
    return node;
  }

  // Metodo per accedere ai plugin
  plugin<T>(name: string): T | undefined {
    return this.gunDb.plugin<T>(name);
  }

  // Accedi direttamente all'istanza Gun con i plugin
  public gun() {
    return this.gunDb.getGun();
  }
}

export class MoguOnChain extends Mogu {
  private contract: ethers.Contract;

  private abi: any[] = [
    "event CIDRegistered(string cid)",
    "function registerCID(string memory cidNew) public",
    "function getCID() public view returns (string memory)",
  ];

  constructor(
    contractAddress: string, 
    signer: ethers.Signer, 
    peers: string[] = [],
    initialState?: Map<string, EncryptedNode>, 
    key?: string
  ) {
    super(peers, key);
    this.contract = new ethers.Contract(contractAddress, this.abi, signer).connect(signer);
  }

  async registerCIDOnChain() {
    const hash = await this.store();
    if (!hash) {
      throw new Error('Failed to store data');
    }
    const tx = await this.contract.registerCID(ethers.utils.toUtf8Bytes(hash));
    await tx.wait();
  }

  async getCurrentCIDFromChain(): Promise<string> {
    const cidBytes = await this.contract.cid();
    return ethers.utils.toUtf8String(cidBytes);
  }
}
