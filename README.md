# MOGU - Decentralized Database with GunDB and IPFS

<img src="./mogu.png" alt="image" width="300" height="300">

Mogu è un wrapper semplificato per GunDB che aggiunge:
- Storage persistente su IPFS 
- Crittografia opzionale
- API REST
- Interfaccia semplificata

## 🔄 Confronto con GunDB puro

### GunDB puro:
```typescript
// GunDB puro
const gun = Gun();
const user = gun.user();

// Autenticazione
user.create('username', 'password');
user.auth('username', 'password');

// Salvataggio dati
gun.get('nodes').get('123').put({
  data: 'Hello World'
});

// Lettura dati
gun.get('nodes').get('123').on(data => {
  console.log(data);
});

// Crittografia manuale con SEA
const encrypted = await SEA.encrypt(data, pair);
const decrypted = await SEA.decrypt(encrypted, pair);
```

### Con Mogu:
```typescript
// Mogu semplifica tutto
const mogu = new Mogu(
  ['http://localhost:8765'],
  'encryption-key',  // Opzionale - se vuoto non cripta
  'PINATA',
  {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
);

// Autenticazione semplificata
await mogu.login('username', 'password');

// Operazioni CRUD con tipi
const node = await mogu.addNode({
  id: "1",
  type: "NODE",
  name: "My Node",
  content: "Hello World"
});

// Lettura con decrittazione automatica
const myNode = await mogu.getNode("1");

// Backup automatico su IPFS
const hash = await mogu.store();
await mogu.pin();
```

## 🌟 Caratteristiche

- ⚡ **Real-time Sync** ereditato da GunDB
- 🔐 **Crittografia Opzionale** - attiva solo se fornisci una chiave
- 📦 **Storage Persistente** su IPFS
- 🌐 **API REST** pronte all'uso
- 🔍 **Query Semplificate**

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

2. Avvia il server:
```bash
npm start
```

## 💻 Utilizzo

### Come SDK

```typescript
import { Mogu } from '@scobru/mogu';

// Senza crittografia
const mogu = new Mogu(
  ['http://localhost:8765'],
  '',  // chiave vuota = no crittografia
  'PINATA',
  config
);

// Con crittografia
const secureDb = new Mogu(
  ['http://localhost:8765'],
  'my-secret-key',  // con chiave = crittografia attiva
  'PINATA',
  config
);

// Operazioni base
await mogu.login('username', 'password');

const node = await mogu.addNode({
  id: "1",
  type: "NODE",
  name: "My Node",
  content: "Hello World"
});

// Query
const nodes = mogu.queryByName("My Node");

// Real-time Updates
mogu.onNodeChange((node) => {
  console.log('Node updated:', node);
});

// Backup su IPFS
const hash = await mogu.store();
await mogu.pin();
```

### Come API REST

```bash
# Crea un nodo
curl -X POST http://localhost:3001/api/addNode \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "type": "NODE",
    "name": "My Node",
    "content": "Hello World"
  }'

# Recupera tutti i nodi
curl http://localhost:3001/api/getAllNodes

# Backup su IPFS
curl -X POST http://localhost:3001/api/save
```

## 🏗️ Architettura

```
src/
├── api/            # API REST e WebSocket
├── config/         # Configurazioni GunDB
├── db/            
│   ├── adapters/   # Storage Adapters
│   └── types/      # Definizioni tipi
├── ipfs/          # Integrazione IPFS
└── sdk/           # SDK principale
```

## 🔒 Sicurezza

- **Crittografia Opzionale**: Attiva solo se fornisci una chiave
- **Autenticazione**: Sistema di login integrato
- **Storage**: Dati distribuiti su IPFS

## 🔍 Query Disponibili

- `queryByName(name)`: Cerca per nome
- `queryByType(type)`: Cerca per tipo
- `queryByContent(content)`: Cerca nel contenuto

## 🧪 Test

```bash
npm test
```

## 📄 Licenza

MIT

## 💬 Supporto

- Apri una Issue su GitHub
- Contatta il team di sviluppo

## 🔗 Links Utili

- [GunDB Documentation](https://gun.eco/docs)
- [IPFS Documentation](https://docs.ipfs.io/)

## 📚 Esempi Dettagliati

### 1. Salvataggio in Nodi Specifici

#### Con GunDB puro:
```typescript
// Salvataggio in un percorso specifico
gun.get('users').get('123').get('profile').put({
  name: 'John',
  age: 30
});

// Lettura da un percorso specifico
gun.get('users').get('123').get('profile').on((data) => {
  console.log(data);
});

// Salvataggio nello user space
user.get('profile').get('settings').put({
  theme: 'dark'
});
```

#### Con Mogu:
```typescript
// Salvataggio in un percorso specifico
await mogu.addNode({
  id: "users/123/profile",  // Il path è codificato nell'ID
  type: "NODE",
  name: "John's Profile",
  content: {
    name: 'John',
    age: 30
  }
});

// Lettura da un percorso specifico
const profile = await mogu.getNode("users/123/profile");

// Salvataggio nello user space (dopo il login)
await mogu.addNode({
  id: "~profile/settings",  // Il prefisso ~ indica lo user space
  type: "NODE",
  name: "User Settings",
  content: {
    theme: 'dark'
  }
});
```

### 2. User Space vs Public Space

#### Con GunDB puro:
```typescript
// Public space - accessibile a tutti
gun.get('public').get('posts').put({
  title: 'Hello World'
});

// User space - accessibile solo dopo login
user.get('private').get('notes').put({
  content: 'Secret note'
});

// Lettura dati pubblici
gun.get('public').get('posts').on(data => console.log(data));

// Lettura dati privati (richiede login)
user.get('private').get('notes').on(data => console.log(data));
```

#### Con Mogu:
```typescript
// Public space
await mogu.addNode({
  id: "public/posts/1",
  type: "NODE",
  name: "Public Post",
  content: {
    title: 'Hello World'
  }
});

// User space (richiede login)
await mogu.login('username', 'password');
await mogu.addNode({
  id: "~private/notes/1",  // Il prefisso ~ indica lo user space
  type: "NODE",
  name: "Private Note",
  content: {
    text: 'Secret note'
  }
});

// Lettura dati pubblici
const publicPost = await mogu.getNode("public/posts/1");

// Lettura dati privati (richiede login)
const privateNote = await mogu.getNode("~private/notes/1");

// Query su dati pubblici
const publicPosts = mogu.queryByName("Public Post");

// Query su dati privati
const privateNotes = mogu.queryByContent("Secret note");
```

### 3. Strutture Dati Complesse

#### Con GunDB puro:
```typescript
// Creazione di una struttura annidata
gun.get('app')
   .get('organizations')
   .get('org1')
   .get('departments')
   .get('dev')
   .get('employees')
   .put({
     count: 10,
     manager: 'Alice'
   });

// Lettura di strutture annidate
gun.get('app')
   .get('organizations')
   .get('org1')
   .get('departments')
   .get('dev')
   .get('employees')
   .on(data => console.log(data));
```

#### Con Mogu:
```typescript
// Creazione di una struttura annidata
await mogu.addNode({
  id: "app/org1/dev/employees",
  type: "NODE",
  name: "Development Team",
  content: {
    count: 10,
    manager: 'Alice',
    department: 'dev',
    organization: 'org1'
  }
});

// Lettura di strutture annidate
const devTeam = await mogu.getNode("app/org1/dev/employees");

// Query per trovare tutti i team di sviluppo
const devTeams = mogu.queryByContent("dev");
```

### 4. Real-time Updates

#### Con GunDB puro:
```typescript
gun.get('live-data').on((data) => {
  console.log('Data updated:', data);
});

gun.get('live-data').put({ value: 42 });
```

#### Con Mogu:
```typescript
// Sottoscrizione ai cambiamenti
mogu.onNodeChange((node) => {
  console.log('Node updated:', node);
});

// Aggiornamento dati
await mogu.addNode({
  id: "live-data",
  type: "NODE",
  name: "Live Value",
  content: { value: 42 }
});
```