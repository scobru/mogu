"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainNodeDatabase = exports.NodeDatabase = void 0;
const pinataAPI_1 = require("../ipfs/pinataAPI");
const ethers_1 = require("ethers");
const db_1 = require("../core/db");
const nameQuery = name => node => node.name === name;
const typeQuery = type => node => node.type === type;
const contentQuery = content => node => node.content === content;
const childrenQuery = children => node =>
  Array.isArray(node.children) && children.every(childId => node.children.includes(childId));
const parentQuery = parent => node => node.parent === parent;
class NodeDatabase {
  constructor(initialState, key) {
    this.state = initialState == null ? initialState || new Map() : this.initializeDatabase();
    this.key = new TextEncoder().encode(key);
  }
  initializeDatabase() {
    console.log("Initializing database...");
    return new Map();
  }
  serialize() {
    const serialized = (0, db_1.serializeDatabase)(this.state, this.key);
    console.log("Serialized:", serialized);
  }
  deserialize(json) {
    const deserialized = (0, db_1.deserializeDatabase)(json, this.key);
    console.log("Deserialized:", deserialized);
  }
  async store() {
    // Store and retrieve from IPFS
    const hash = await (0, db_1.storeDatabase)(this.state, this.key);
    console.log("Database stored with hash:", hash);
    return hash;
  }
  async retrieve(hash) {
    const retrieved = await (0, db_1.retrieveDatabase)(hash, this.key);
    console.log("Retrieved:", retrieved);
    return retrieved;
  }
  addNode(node) {
    const state = (0, db_1.addNode)(this.state, node);
    this.state = state;
  }
  removeNode(id) {
    return (0, db_1.removeNode)(this.state, id);
  }
  getNode(id) {
    return this.state.get(id);
  }
  getAllNodes() {
    return Array.from(this.state.values());
  }
  getParent(id) {
    const node = this.state.get(id);
    if (node && node.parent) {
      return this.state.get(node.parent);
    }
    return null;
  }
  updateNode(node) {
    this.state.set(node.id, node);
  }
  getChildren(id) {
    const node = this.state.get(id);
    if (!node || !node.children) return [];
    return node.children.map(childId => this.state.get(childId)).filter(Boolean);
  }
  query(predicate) {
    const nodes = this.getAllNodes();
    return nodes.filter(predicate);
  }
  async pin() {
    const hash = await this.store();
    await (0, pinataAPI_1.pinJSONToIPFS)(hash);
  }
  async unpin(hash) {
    await (0, pinataAPI_1.unpinFromIPFS)(hash);
  }
  queryByName(name) {
    return this.query(nameQuery(name));
  }
  queryByType(type) {
    return this.query(typeQuery(type));
  }
  queryByContent(content) {
    return this.query(contentQuery(content));
  }
  queryByChildren(children) {
    return this.query(childrenQuery(children));
  }
  queryByParent(parent) {
    return this.query(parentQuery(parent));
  }
}
exports.NodeDatabase = NodeDatabase;
class OnChainNodeDatabase extends NodeDatabase {
  constructor(contractAddress, signer, initialState, key) {
    super(initialState, key);
    this.abi = [
      "event CIDRegistered(address indexed owner, string cid)",
      "function registerCID(string memory _cid) public",
      "function getCID(address _owner) public view returns (string)",
    ];
    this.contract = new ethers_1.ethers.Contract(contractAddress, this.abi, signer).connect(signer);
  }
  async registerCIDOnChain() {
    const hash = await this.store(); // Questo è il metodo store della classe padre (NodeDatabase)
    const tx = await this.contract.registerCID(hash);
    await tx.wait();
  }
  // Se desideri anche un metodo per ottenere il CID corrente dal contratto:
  async getCurrentCIDFromChain() {
    const cidBytes = await this.contract.cid();
    return ethers_1.ethers.utils.toUtf8String(cidBytes);
  }
}
exports.OnChainNodeDatabase = OnChainNodeDatabase;
