"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveDatabase = exports.storeDatabase = exports.deserializeDatabase = exports.serializeDatabase = exports.query = exports.getAllNodes = exports.getNode = exports.updateNode = exports.removeNode = exports.addNode = exports.NodeType = void 0;
const types_1 = require("./types");
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return types_1.NodeType; } });
const pinataAPI_1 = require("../ipfs/pinataAPI");
// Funzioni base per la gestione dello stato
const addNode = (state, node) => {
    const newState = new Map(state);
    newState.set(node.id, node);
    return newState;
};
exports.addNode = addNode;
const removeNode = (state, id) => {
    const newState = new Map(state);
    newState.delete(id);
    return newState;
};
exports.removeNode = removeNode;
const updateNode = (state, node) => {
    return (0, exports.addNode)(state, node);
};
exports.updateNode = updateNode;
const getNode = (state, id) => {
    return state.get(id);
};
exports.getNode = getNode;
const getAllNodes = (state) => {
    return Array.from(state.values());
};
exports.getAllNodes = getAllNodes;
// Funzioni di query semplificate
const query = (state, predicate) => {
    return (0, exports.getAllNodes)(state).filter(predicate);
};
exports.query = query;
// Funzioni per la serializzazione
const serializeDatabase = async (state) => {
    const nodes = (0, exports.getAllNodes)(state);
    return JSON.stringify(nodes);
};
exports.serializeDatabase = serializeDatabase;
const deserializeDatabase = async (json) => {
    const jsonString = typeof json === 'object' ? JSON.stringify(json) : json;
    try {
        const parsed = JSON.parse(jsonString);
        return parsed.map((node) => ({
            id: node.id,
            type: types_1.NodeType.NODE,
            name: node.name,
            content: node.content,
            encrypted: Boolean(node.encrypted)
        }));
    }
    catch (err) {
        console.error('Error deserializing database:', err);
        throw err;
    }
};
exports.deserializeDatabase = deserializeDatabase;
// Funzioni IPFS
const storeDatabase = async (state) => {
    const serialized = await (0, exports.serializeDatabase)(state);
    return await (0, pinataAPI_1.pinJSONToIPFS)(JSON.parse(serialized));
};
exports.storeDatabase = storeDatabase;
const retrieveDatabase = async (hash) => {
    try {
        const data = await (0, pinataAPI_1.fetchFromIPFS)(hash);
        const jsonString = Array.isArray(data) ? JSON.stringify(data) : data;
        return (0, exports.deserializeDatabase)(jsonString);
    }
    catch (err) {
        console.error('Error retrieving database:', err);
        throw err;
    }
};
exports.retrieveDatabase = retrieveDatabase;
