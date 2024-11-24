"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const wss = new ws_1.default.Server({ port: 3002 });
let gunDb;
const initializeWebSocket = (gunDbInstance) => {
    gunDb = gunDbInstance;
    wss.on("connection", (ws) => {
        ws.on("message", async (message) => {
            const { method, params } = JSON.parse(message);
            switch (method) {
                case "addNode":
                    await gunDb.addNode(params);
                    ws.send(JSON.stringify({ method: "nodeAdded", params }));
                    break;
                case "removeNode":
                    await gunDb.removeNode(params.id);
                    ws.send(JSON.stringify({ method: "nodeRemoved", params: { id: params.id } }));
                    break;
                case "updateNode":
                    await gunDb.updateNode(params);
                    ws.send(JSON.stringify({ method: "nodeUpdated", params }));
                    break;
                case "getNode":
                    const node = await gunDb.getNode(params.id);
                    ws.send(JSON.stringify({ method: "node", params: node }));
                    break;
            }
        });
    });
};
exports.initializeWebSocket = initializeWebSocket;
