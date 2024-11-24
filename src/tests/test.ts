import { Mogu } from "../sdk/sdk";
import { NodeType } from "../db/types";
import dotenv from 'dotenv';
import { startServer } from '../server';

dotenv.config();

const TEST_TIMEOUT = 30000;

async function run() {
  try {
    console.log("Starting tests...");
    
    // Avvia il server Gun
    const { gunDb } = await startServer();
    console.log("Gun server started");
    
    // Crea istanza Mogu
    const mogu = new Mogu({
      storageService: 'PINATA',
      storageConfig: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      }
    });

    // Esegui i test
    await runTests(mogu);
    console.log("All tests completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

async function runTests(mogu: Mogu) {
  try {
    // Login
    await mogu.login('testuser', 'testpass');
    console.log('Login successful');

    // Test operazioni base
    await testBasicOperations(mogu);
    
    // Test backup e restore
    await testBackup(mogu);

  } catch (err) {
    console.error(`Test failed:`, err);
    throw err;
  }
}

async function testBasicOperations(mogu: Mogu) {
  // Test put
  await mogu.put('test/data1', { value: 'test1' });
  await mogu.put('test/data2', { value: 'test2' });
  
  // Test get
  const data1 = await mogu.get('test/data1');
  console.log('Retrieved data1:', data1);
  
  // Test real-time updates
  mogu.on('test/data1', (data) => {
    console.log('Data1 updated:', data);
  });

  // Attendi che i dati siano sincronizzati
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testBackup(mogu: Mogu) {
  // Salva alcuni dati di test
  const testData = {
    'test/1': { value: 'one' },
    'test/2': { value: 'two' },
    'test/nested/3': { value: 'three' }
  };

  // Inserisci i dati
  for (const [path, data] of Object.entries(testData)) {
    await mogu.put(path, data);
  }

  // Attendi che i dati siano sincronizzati
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verifica lo stato prima del backup
  const originalState = mogu.getState();
  console.log('Original state:', originalState);

  // Crea il backup
  const hash = await mogu.backup();
  console.log('Backup created with hash:', hash);

  // Cancella i dati
  const gun = mogu.getGun();
  gun.get('nodes').put(null);

  // Attendi che i dati siano cancellati
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Ripristina dal backup
  await mogu.restore(hash);
  
  // Attendi che i dati siano ripristinati
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verifica lo stato dopo il ripristino
  const restoredState = mogu.getState();
  console.log('Restored state:', restoredState);

  // Verifica che i dati siano identici
  for (const [path, data] of Object.entries(testData)) {
    const restored = await mogu.get(path);
    if (JSON.stringify(restored?.value) !== JSON.stringify(data.value)) {
      throw new Error(`Data mismatch at ${path}`);
    }
  }

  console.log('Backup integrity verified');
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
