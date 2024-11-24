# MOGU - Decentralized Database with GunDB and IPFS

## Architettura e Concetti Chiave

### 1. Core Components

#### 1.1 GunDB Wrapper (GunMogu)
- Gestisce l'istanza di GunDB
- Implementa il sistema di autenticazione
- Gestisce lo stato interno dei nodi
- Supporta path gerarchici (es: "org/team1/projects/1")
- Gestisce lo user space ("~/") per dati privati

#### 1.2 Storage Layer (Web3Stash)
- Interfaccia unificata per storage distribuito
- Supporta multiple implementazioni:
  - IPFS/Pinata
  - Arweave
  - Bundlr
  - NFT.Storage
  - Web3.Storage
  - Lighthouse

#### 1.3 SDK (Mogu)
- Wrapper di alto livello
- API semplificata per operazioni CRUD
- Gestione automatica del backup/restore
- Sistema di query

### 2. Inizializzazione

```typescript
// Server-side
const server = express().listen(8765);
const { gunDb } = await startServer();

// Client-side
const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});
```

### 3. Autenticazione

```typescript
// Login (crea l'utente se non esiste)
await mogu.login('username', 'password');
```

### 4. Operazioni Base

```typescript
// Scrittura
await mogu.put('users/1', { 
  value: { name: 'John' } 
});

// Lettura
const data = await mogu.get('users/1');

// Real-time updates
mogu.on('users/1', (data) => {
  console.log('User updated:', data);
});
```

### 5. Backup e Restore

```typescript
// Backup su storage distribuito
const hash = await mogu.backup();

// Restore da hash
await mogu.restore(hash);

// Rimozione backup
await mogu.removeBackup(hash);
```

## Implementazione Dettagliata

### 1. Struttura dei Dati

```typescript
interface EncryptedNode {
  id: string;          // Path gerarchico univoco
  type: NodeType;      // Tipo del nodo (default: 'NODE')
  name: string;        // Nome del nodo
  content?: any;       // Contenuto (può essere crittografato)
  encrypted?: boolean; // Flag di crittografia
}
```

### 2. Gestione dei Path

- Supporto per path gerarchici: `org/team1/projects/1`
- User space privato: `~/notes/private`
- Path parsing automatico
- Creazione automatica dei nodi intermedi

### 3. Sincronizzazione

- Real-time sync tramite GunDB
- Stato interno mantenuto in `Map<string, EncryptedNode>`
- Backup asincrono su storage distribuito
- Restore con verifica dell'integrità

### 4. Storage Distribuito

```typescript
interface StorageService {
  uploadJson(data: Record<string, unknown>): Promise<UploadOutput>;
  unpin(hash: string): Promise<void>;
}

interface UploadOutput {
  id: string;
  metadata: Record<string, unknown>;
}
```

### 5. API REST e WebSocket

```typescript
// REST Endpoints
POST /api/addNode
POST /api/updateNode
POST /api/removeNode
GET  /api/getAllNodes
POST /api/queryByName
POST /api/queryByType
POST /api/queryByContent

// WebSocket Events
{
  method: "addNode" | "removeNode" | "updateNode" | "getNode",
  params: EncryptedNode | { id: string }
}
```

## Best Practices

1. **Inizializzazione**:
   - Avvia sempre il server prima dei client
   - Usa environment variables per le chiavi API
   - Gestisci gli errori di connessione

2. **Autenticazione**:
   - Attendi il completamento del login
   - Verifica lo stato dell'utente prima delle operazioni
   - Gestisci il logout esplicito

3. **Operazioni sui Dati**:
   - Usa path significativi e gerarchici
   - Attendi la sincronizzazione dopo le scritture
   - Verifica l'integrità dopo il restore

4. **Backup**:
   - Esegui backup periodici
   - Verifica l'integrità dei backup
   - Mantieni un registro dei backup
   - Rimuovi i backup obsoleti

5. **Performance**:
   - Usa batch operations per operazioni multiple
   - Implementa caching lato client
   - Monitora l'uso della memoria

## Troubleshooting

1. **Errori Comuni**:
   - `User not authenticated`: Esegui il login
   - `Storage service not initialized`: Verifica la configurazione
   - `Invalid backup data`: Controlla il formato dei dati

2. **Debug**:
   - Abilita i log dettagliati
   - Verifica lo stato della connessione
   - Controlla gli errori di rete

## Testing

```bash
# Test completi
yarn test

# Test specifici
yarn test:api     # Test API REST
yarn test:storage # Test storage
yarn test:sync    # Test sincronizzazione
```

## Estensioni

1. **Plugin**:
   - Aggiungi funzionalità custom
   - Estendi le query
   - Implementa middleware

2. **Storage Custom**:
   - Implementa `StorageService`
   - Aggiungi nuovo provider
   - Configura opzioni custom

## Sicurezza

1. **Crittografia**:
   - Dati crittografati a riposo
   - Chiavi private mai salvate
   - Verifica dell'integrità

2. **Autenticazione**:
   - Token JWT
   - Sessioni sicure
   - Rate limiting

## Limitazioni Note

1. **Scalabilità**:
   - Limite di dimensione per nodo
   - Numero massimo di peer
   - Latenza in reti grandi

2. **Compatibilità**:
   - Browser moderni
   - Node.js 14+
   - WebSocket required

## Roadmap

1. **Prossime Feature**:
   - Sharding automatico
   - Compressione dati
   - Backup incrementali

2. **Miglioramenti**:
   - Performance query
   - Gestione memoria
   - Resilienza rete