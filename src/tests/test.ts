import { Mogu } from "../sdk/sdk";
import { NodeType } from "../db/types";
import dotenv from 'dotenv';
import { startServer } from '../server';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const TEST_TIMEOUT = 30000;
const RADATA_PATH = path.join(process.cwd(), "radata");

/**
 * Mogu Test Suite
 * Tests core functionality including:
 * - Basic operations (put/get)
 * - Backup and restore
 * - Backup integrity verification
 * 
 * Run with: yarn test
 */

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

  // Attendi che i dati siano scritti su disco
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verifica che i file radata esistano
  try {
    await fs.access(RADATA_PATH);
    console.log('Radata directory exists:', RADATA_PATH);
  } catch (err) {
    throw new Error(`Radata directory not found at ${RADATA_PATH}`);
  }

  // Crea il backup
  const hash = await mogu.backup();
  console.log('Backup created with hash:', hash);

  // Salva il contenuto originale dei file
  const originalFiles = new Map();
  const files = await fs.readdir(RADATA_PATH);
  for (const file of files) {
    const content = await fs.readFile(path.join(RADATA_PATH, file), 'utf8');
    originalFiles.set(file, content);
  }

  // Cancella la directory radata
  await fs.rm(RADATA_PATH, { recursive: true, force: true });
  console.log('Radata directory deleted');

  // Ripristina dal backup
  const restoreResult = await mogu.restore(hash);
  console.log('Backup restored:', restoreResult);
  
  // Attendi che i file siano ripristinati
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verifica che i file siano stati ripristinati correttamente
  const restoredFiles = new Map();
  const newFiles = await fs.readdir(RADATA_PATH);
  for (const file of newFiles) {
    const content = await fs.readFile(path.join(RADATA_PATH, file), 'utf8');
    restoredFiles.set(file, content);
  }

  // Confronta i file originali con quelli ripristinati
  for (const [file, content] of originalFiles) {
    if (!restoredFiles.has(file)) {
      throw new Error(`Missing restored file: ${file}`);
    }
    
    const restoredContent = restoredFiles.get(file);
    if (restoredContent !== content) {
      throw new Error(`Content mismatch in file: ${file}`);
    }
  }

  // Verifica che i dati siano accessibili tramite Gun
  for (const [path, data] of Object.entries(testData)) {
    const restored = await mogu.get(path);
    if (JSON.stringify(restored?.value) !== JSON.stringify(data.value)) {
      throw new Error(`Data mismatch at ${path}`);
    }
  }

  console.log('Backup and restore verified successfully');

  // Test di confronto backup
  console.log('Testing backup comparison...');
  
  // Prima verifica: dovrebbe essere uguale
  const comparison1 = await mogu.compareBackup(hash);
  console.log('Initial comparison:', comparison1);
  if (!comparison1.isEqual) {
    console.error('Comparison details:', comparison1.differences);
    throw new Error('Backup should be equal after restore');
  }

  // Modifica un file locale
  const testFile = '!';
  const filePath = path.join(RADATA_PATH, testFile);
  const originalContent = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(filePath, JSON.stringify({ modified: true }));

  // Seconda verifica: dovrebbe essere diverso
  const comparison2 = await mogu.compareBackup(hash);
  console.log('Comparison after modification:', comparison2);
  if (comparison2.isEqual) {
    throw new Error('Backup should be different after local modification');
  }

  // Ripristina il contenuto originale
  await fs.writeFile(filePath, originalContent);

  // Verifica finale dopo il ripristino
  const comparison3 = await mogu.compareBackup(hash);
  console.log('Final comparison:', comparison3);
  if (!comparison3.isEqual) {
    console.error('Final comparison details:', comparison3.differences);
    throw new Error('Backup should be equal after content restore');
  }

  console.log('Backup comparison tests completed successfully');
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
