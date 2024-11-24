# MOGU - Decentralized Database with GunDB and IPFS

<img src="./mogu.png" alt="image" width="300" height="300">

Mogu è un wrapper semplificato per GunDB che aggiunge:
- Storage persistente su IPFS/Pinata/Arweave/Bundlr
- Crittografia integrata
- API REST e WebSocket
- Query semplificate
- Supporto per percorsi gerarchici

## 🚀 Installazione

```bash
npm install @scobru/mogu
# o
yarn add @scobru/mogu
```

## ⚙️ Configurazione

1. Crea un file `.env`:
```env
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
```

2. Inizializza il server:
```typescript
import { initGun } from '@scobru/mogu';
import express from 'express';

const app = express();
const server = app.listen(8765);
const gunInstance = initGun(server);
```

## 💻 Utilizzo Base

```typescript
import { Mogu } from '@scobru/mogu';
import { initializeGun } from '@scobru/mogu/config';

// Inizializza Gun
const gunInstance = initializeGun(['http://localhost:8765']);

// Crea istanza Mogu
const mogu = new Mogu(
  ['http://localhost:8765'],
  'encryption-key',  // Opzionale
  'PINATA',
  {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
);

// Login
await mogu.login('username', 'password');

// Operazioni CRUD
const node = await mogu.addNode({
  id: "docs/readme",
  type: "NODE",
  name: "README",
  content: "# Hello World"
});

// Lettura
const myNode = await mogu.getNode("docs/readme");

// Query
const nodes = await mogu.queryByName("README");

// Real-time Updates
mogu.onNodeChange((node) => {
  console.log('Node updated:', node);
});

// Backup su IPFS/Pinata
const hash = await mogu.store();
await mogu.pin();
```

## 🌟 Features

### Percorsi Gerarchici
```typescript
// Struttura organizzativa
await mogu.addNode({
  id: "org/team1/projects/project1",
  type: "NODE",
  name: "Project 1",
  content: { status: "active" }
});

// User space privato
await mogu.addNode({
  id: "~/notes/private",  // ~ indica user space
  type: "NODE",
  name: "Private Notes",
  content: "Secret"
});
```

### Query Avanzate
```typescript
// Query per nome
const nodesByName = await mogu.queryByName("Project 1");

// Query per tipo
const nodesByType = await mogu.queryByType(NodeType.NODE);

// Query per contenuto
const nodesByContent = await mogu.queryByContent("active");
```

### WebSocket API
```typescript
// Client
const ws = new WebSocket('ws://localhost:3002');

ws.send(JSON.stringify({
  method: "addNode",
  params: {
    id: "test/node1",
    type: "NODE",
    name: "Test Node",
    content: "Hello"
  }
}));

ws.onmessage = (event) => {
  const { method, params } = JSON.parse(event.data);
  console.log(method, params);
};
```

### REST API
```bash
# Crea nodo
curl -X POST http://localhost:3001/api/addNode \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test/node1",
    "type": "NODE",
    "name": "Test Node",
    "content": "Hello"
  }'

# Query
curl -X POST http://localhost:3001/api/queryByName \
  -H "Content-Type: application/json" \
  -d '{ "name": "Test Node" }'
```

## 🏗️ Architettura

```
src/
├── api/            # REST & WebSocket APIs
├── config/         # Gun configuration
├── db/            
│   ├── gunDb.ts   # Core GunDB wrapper
│   └── types.ts   # Type definitions
├── ipfs/          # IPFS/Pinata integration
└── sdk/           # Main SDK
```

## 🔒 Sicurezza

- **Crittografia Integrata**: Attivata fornendo una chiave
- **User Space**: Area privata per dati utente (`~/`)
- **Autenticazione**: Sistema login integrato
- **Storage Distribuito**: IPFS, Pinata, Arweave o Bundlr

## 🧪 Testing

```bash
# Esegui i test
yarn test

# Test specifici
yarn test:api
yarn test:storage
```

## 📄 Licenza

MIT

## 🔗 Links

- [Documentazione](https://github.com/yourusername/mogu/docs)
- [Esempi](https://github.com/yourusername/mogu/examples)
- [Issues](https://github.com/yourusername/mogu/issues)