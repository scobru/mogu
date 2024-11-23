import { addNode, removeNode, getNode, updateNode, EncryptedNode } from "../db/db";
import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 3002 });

const state = new Map<string, EncryptedNode>();

wss.on(
  "connection",
  (ws: { on: (arg0: string, arg1: (message: any) => void) => void; send: (arg0: string) => void }) => {
    ws.on("message", (message: string) => {
      const { method, params } = JSON.parse(message);
      switch (method) {
        case "addNode":
          addNode(state, params as EncryptedNode);
          ws.send(JSON.stringify({ method: "nodeAdded", params: params as EncryptedNode }));
          break;
        case "removeNode":
          removeNode(state, params.id as string);
          ws.send(
            JSON.stringify({
              method: "nodeRemoved",
              params: { id: params.id as string },
            }),
          );
          break;
        case "updateNode":
          ws.send(
            JSON.stringify({
              method: "nodeUpdated",
              params: updateNode(state, params as EncryptedNode),
            }),
          );
          break;
        case "getNode":
          ws.send(
            JSON.stringify({
              method: "node",
              params: getNode(state, params.id as string),
            }),
          );
          break;
      }
    });
  },
);
