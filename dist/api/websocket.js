"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../core/db");
const ws_1 = __importDefault(require("ws"));
const wss = new ws_1.default.Server({ port: 3002 });
const state = new Map();
wss.on("connection", ws => {
  ws.on("message", message => {
    const { method, params } = JSON.parse(message);
    switch (method) {
      case "addNode":
        (0, db_1.addNode)(state, params);
        ws.send(JSON.stringify({ method: "nodeAdded", params: params }));
        break;
      case "removeNode":
        (0, db_1.removeNode)(state, params.id);
        ws.send(
          JSON.stringify({
            method: "nodeRemoved",
            params: { id: params.id },
          }),
        );
        break;
      case "updateNode":
        ws.send(
          JSON.stringify({
            method: "nodeUpdated",
            params: (0, db_1.updateNode)(state, params),
          }),
        );
        break;
      case "getNode":
        ws.send(
          JSON.stringify({
            method: "node",
            params: (0, db_1.getNode)(state, params.id),
          }),
        );
        break;
      case "getChildren":
        ws.send(
          JSON.stringify({
            method: "children",
            params: (0, db_1.getChildren)(state, params.id),
          }),
        );
        break;
    }
  });
});
