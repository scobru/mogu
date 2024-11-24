import { NodeType, EncryptedNode } from "../db/types";
import { GunMogu } from "../db/gunDb";
import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 3002 });
let gunDb: GunMogu;

export const initializeWebSocket = (gunDbInstance: GunMogu) => {
  gunDb = gunDbInstance;

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", async (message: string) => {
      const { method, params } = JSON.parse(message);
      
      switch (method) {
        case "addNode":
          await gunDb.addNode(params as EncryptedNode);
          ws.send(JSON.stringify({ method: "nodeAdded", params }));
          break;
          
        case "removeNode":
          await gunDb.removeNode(params.id);
          ws.send(JSON.stringify({ method: "nodeRemoved", params: { id: params.id } }));
          break;
          
        case "updateNode":
          await gunDb.updateNode(params as EncryptedNode);
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
