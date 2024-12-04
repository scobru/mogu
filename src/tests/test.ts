import { Mogu } from "../mogu";
import type { FileDiff } from '../versioning';
import type { BackupOptions } from '../types/backup';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

dotenv.config();

const TEST_DIR = path.join(process.cwd(), 'test-files');
const RESTORE_DIR = path.join(process.cwd(), 'restored-files');
const RADATA_DIR = path.join(process.cwd(), 'test-radata');
const TEST_ENCRYPTION_KEY = 'test-encryption-key-123';

async function run() {
  try {
    console.log("Starting tests...");
    
    await fs.ensureDir(TEST_DIR);
    await fs.ensureDir(RESTORE_DIR);
    await fs.ensureDir(RADATA_DIR);

    // Test file backup senza crittografia
    console.log("\n=== Testing File Backup (Unencrypted) ===");
    await testFileBackup(false);

    // Test file backup con crittografia
    console.log("\n=== Testing File Backup (Encrypted) ===");
    await testFileBackup(true);

    // Test backup della directory radata
    console.log("\n=== Testing Radata Directory Backup ===");
    await testRadataBackup();

    // Test del sistema di cache
    console.log("\n=== Testing Cache System ===");
    await testCacheSystem();

    // Test delle funzionalità di confronto
    console.log("\n=== Testing Compare Features ===");
    await testCompare();

    console.log("\nAll tests completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await fs.remove(TEST_DIR).catch(() => {});
    await fs.remove(RESTORE_DIR).catch(() => {});
    await fs.remove(RADATA_DIR).catch(() => {});
  }
}

async function testFileBackup(useEncryption: boolean) {
  const mogu = new Mogu({
    storage: {
      service: 'PINATA',
      config: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      }
    },
    paths: {
      radata: RADATA_DIR,
      backup: TEST_DIR,
      restore: RESTORE_DIR,
      storage: path.join(process.cwd(), 'storage'),
      logs: path.join(process.cwd(), 'logs')
    },
    features: {
      useIPFS: false,
      useGun: false,
      encryption: {
        enabled: useEncryption,
        algorithm: 'aes-256-gcm'
      }
    },
    performance: {
      maxConcurrent: 3,
      chunkSize: 1024 * 1024,
      cacheEnabled: true,
      cacheSize: 100
    }
  });

  // Crea file di test
  const testFiles = {
    'test.txt': 'Hello World',
    'data.json': JSON.stringify({ test: 'data' }),
    'image.png': Buffer.from('fake-image-data')
  };

  // Scrivi i file di test
  for (const [name, content] of Object.entries(testFiles)) {
    await fs.writeFile(path.join(TEST_DIR, name), content);
  }

  // Opzioni di backup
  const backupOptions: BackupOptions | undefined = useEncryption ? {
    encryption: {
      enabled: true,
      key: TEST_ENCRYPTION_KEY
    }
  } : undefined;

  // Test backup
  console.log("Creating backup...");
  const backup = await mogu.backup(TEST_DIR, backupOptions);
  console.log("Backup created:", backup.hash);

  // Rimuovi i file originali
  await fs.emptyDir(TEST_DIR);

  // Test restore
  console.log("Restoring backup...");
  await mogu.restore(backup.hash, RESTORE_DIR, backupOptions);

  // Verifica file ripristinati
  for (const [name, originalContent] of Object.entries(testFiles)) {
    const restoredPath = path.join(RESTORE_DIR, name);
    const restoredContent = await fs.readFile(restoredPath);
    
    // Confronta il contenuto in base al tipo di file
    if (name.endsWith('.png')) {
      // Per i file binari, confronta i buffer
      if (!Buffer.from(originalContent).equals(restoredContent)) {
        throw new Error(`Binary content mismatch in ${name}`);
      }
    } else {
      // Per i file di testo, confronta le stringhe
      if (restoredContent.toString() !== originalContent) {
        throw new Error(`Content mismatch in ${name}`);
      }
    }
  }

  // Test con chiave sbagliata se stiamo usando la crittografia
  if (useEncryption) {
    console.log("Testing restore with wrong key...");
    try {
      await mogu.restore(backup.hash, RESTORE_DIR, {
        encryption: {
          enabled: true,
          key: 'wrong-key'
        }
      });
      throw new Error('Restore with wrong key should have failed');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('decrypt')) {
        throw error;
      }
      console.log("Restore with wrong key failed as expected");
    }
  }

  console.log(`File backup test ${useEncryption ? '(encrypted)' : '(unencrypted)'} passed`);
}

async function testRadataBackup() {
  try {
    // Assicurati che la directory esista
    await fs.ensureDir(RADATA_DIR);

    // Crea un'istanza di Mogu
    const mogu = new Mogu({
      storage: {
        service: 'PINATA',
        config: {
          apiKey: process.env.PINATA_API_KEY || '',
          apiSecret: process.env.PINATA_API_SECRET || ''
        }
      },
      paths: {
        radata: RADATA_DIR,
        backup: TEST_DIR,
        restore: RESTORE_DIR,
        storage: path.join(process.cwd(), 'storage'),
        logs: path.join(process.cwd(), 'logs')
      },
      features: {
        useIPFS: false,
        useGun: false,
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm'
        }
      },
      performance: {
        maxConcurrent: 3,
        chunkSize: 1024 * 1024,
        cacheEnabled: true,
        cacheSize: 100
      }
    });

    // Crea alcuni file di test nella directory radata
    const testData = {
      'test.json': JSON.stringify({ key: 'test/key', value: 'test-data' }),
      'data.json': JSON.stringify({ timestamp: Date.now() })
    };

    for (const [name, content] of Object.entries(testData)) {
      await fs.writeFile(path.join(RADATA_DIR, name), content);
    }

    // Backup della directory radata
    console.log("Creating radata backup...");
    const backup = await mogu.backup(RADATA_DIR);
    console.log("Radata backup created:", backup.hash);

    // Salva il contenuto originale della directory
    const originalFiles = await fs.readdir(RADATA_DIR);
    const originalContents = new Map();
    
    for (const file of originalFiles) {
      const content = await fs.readFile(path.join(RADATA_DIR, file));
      originalContents.set(file, content);
    }

    // Cancella completamente la directory radata
    console.log("Removing radata directory...");
    await fs.remove(RADATA_DIR);
    
    // Verifica che la directory sia stata effettivamente cancellata
    const exists = await fs.pathExists(RADATA_DIR);
    if (exists) {
      throw new Error('Failed to remove radata directory');
    }
    console.log("Radata directory removed successfully");

    // Ripristina il backup
    console.log("Restoring radata backup...");
    await mogu.restore(backup.hash, RADATA_DIR);

    // Aspetta un momento per assicurarsi che il ripristino sia completato
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verifica che i file siano stati ripristinati correttamente
    const restoredFiles = await fs.readdir(RADATA_DIR);
    
    // Verifica che tutti i file originali siano presenti
    if (restoredFiles.length !== originalFiles.length) {
      throw new Error(`Number of files mismatch: expected ${originalFiles.length}, got ${restoredFiles.length}`);
    }

    // Verifica il contenuto di ogni file
    for (const file of restoredFiles) {
      const restoredContent = await fs.readFile(path.join(RADATA_DIR, file));
      const originalContent = originalContents.get(file);

      if (!originalContent || !restoredContent.equals(originalContent)) {
        throw new Error(`Content mismatch in ${file}`);
      }
    }

    console.log("Radata backup test passed");
  } catch (error) {
    console.error("Error during radata test:", error);
    throw error;
  }
}

async function testCacheSystem() {
  console.log("\n=== Testing Cache System ===");
  
  const mogu = new Mogu({
    storage: {
      service: 'PINATA',
      config: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      }
    },
    paths: {
      radata: RADATA_DIR,
      backup: TEST_DIR,
      restore: RESTORE_DIR,
      storage: path.join(process.cwd(), 'storage'),
      logs: path.join(process.cwd(), 'logs')
    },
    features: {
      useIPFS: false,
      useGun: false,
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm'
      }
    },
    performance: {
      maxConcurrent: 3,
      chunkSize: 1024 * 1024,
      cacheEnabled: true,
      cacheSize: 2  // Dimensione piccola per testare il limite
    }
  });

  // Test 1: Verifica caching dei file...
  console.log("Test 1: Verifica caching dei file...");
  
  // Creiamo una struttura di file più complessa
  const testDir = path.join(TEST_DIR, 'cache-test');
  await fs.ensureDir(testDir);
  
  // Creiamo multipli file con contenuto significativo
  const numFiles = 10;
  const fileContent = 'Test content '.repeat(10000); // Circa 120KB per file
  
  console.log("Creazione files di test...");
  for (let i = 0; i < numFiles; i++) {
    await fs.writeFile(path.join(testDir, `test-${i}.txt`), fileContent);
  }
  
  const backup1 = await mogu.backup(testDir);
  console.log("Primo backup creato:", backup1.hash);
  
  // Facciamo più restore per avere una media dei tempi
  const numTests = 3;
  let totalTime1 = 0;
  let totalTime2 = 0;

  console.log("Eseguo test di restore multipli...");
  
  // Prima serie di test (senza cache)
  console.log("\nPrima serie - senza cache:");
  for (let i = 0; i < numTests; i++) {
    await fs.emptyDir(RESTORE_DIR);
    const startTime = Date.now();
    await mogu.restore(backup1.hash, RESTORE_DIR);
    const duration = Date.now() - startTime;
    totalTime1 += duration;
    console.log(`Test ${i + 1}: ${duration}ms`);
  }

  // Seconda serie di test (con cache)
  console.log("\nSeconda serie - con cache:");
  for (let i = 0; i < numTests; i++) {
    await fs.emptyDir(RESTORE_DIR);
    const startTime = Date.now();
    await mogu.restore(backup1.hash, RESTORE_DIR);
    const duration = Date.now() - startTime;
    totalTime2 += duration;
    console.log(`Test ${i + 1}: ${duration}ms`);
  }

  const avgTime1 = totalTime1 / numTests;
  const avgTime2 = totalTime2 / numTests;

  console.log(`\nTempo medio primo restore (senza cache): ${avgTime1.toFixed(2)} ms`);
  console.log(`Tempo medio secondo restore (con cache): ${avgTime2.toFixed(2)} ms`);
  console.log(`Differenza: ${(avgTime1 - avgTime2).toFixed(2)} ms (${((avgTime1 - avgTime2) / avgTime1 * 100).toFixed(2)}%)`);

  // Verifichiamo che il secondo tempo sia almeno il 95% del primo
  if (avgTime2 > avgTime1 * 0.95) {
    throw new Error(
      `Il restore con cache non è significativamente più veloce\n` +
      `Primo restore: ${avgTime1.toFixed(2)}ms\n` +
      `Secondo restore: ${avgTime2.toFixed(2)}ms\n` +
      `Miglioramento: ${((avgTime1 - avgTime2) / avgTime1 * 100).toFixed(2)}%`
    );
  }

  // Test 2: Verifica limite della cache...
  console.log("\nTest 2: Verifica limite della cache...");
  
  // Crea una directory per ogni test
  const testDirs = [
    { name: 'cache-test1', content: 'Content 1' },
    { name: 'cache-test2', content: 'Content 2' },
    { name: 'cache-test3', content: 'Content 3' }
  ];

  // Crea directory e file di test
  for (const dir of testDirs) {
    const dirPath = path.join(TEST_DIR, dir.name);
    await fs.ensureDir(dirPath);
    await fs.writeFile(path.join(dirPath, 'test.txt'), dir.content);
  }

  // Esegui backup e restore per ogni directory
  for (const dir of testDirs) {
    const dirPath = path.join(TEST_DIR, dir.name);
    const backup = await mogu.backup(dirPath);
    const restorePath = path.join(RESTORE_DIR, dir.name);
    await fs.ensureDir(restorePath);
    await mogu.restore(backup.hash, restorePath);
    console.log(`Backup e restore completati per ${dir.name}`);
  }

  // Test 3: Verifica cache con file modificati
  console.log("\nTest 3: Verifica cache con file modificati...");
  
  // Crea una directory per il test di modifica
  const modTestDir = path.join(TEST_DIR, 'mod-test');
  await fs.ensureDir(modTestDir);
  const modTestFile = path.join(modTestDir, 'test.txt');
  
  // Scrivi il contenuto iniziale
  console.log("Creazione file iniziale...");
  await fs.writeFile(modTestFile, 'Initial content');
  const modBackup1 = await mogu.backup(modTestDir);
  console.log("Primo backup creato:", modBackup1.hash);

  // Aspetta un momento per assicurarsi che il timestamp sia diverso
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Modifica il file e forza l'invalidazione della cache
  console.log("\nModifica del file...");
  
  // Rinomina la directory per forzare un nuovo backup
  const modTestDir2 = path.join(TEST_DIR, 'mod-test-2');
  await fs.move(modTestDir, modTestDir2);
  await fs.writeFile(path.join(modTestDir2, 'test.txt'), 'Modified content');
  
  // Forza la modifica del timestamp del file
  const modifiedFile = path.join(modTestDir2, 'test.txt');
  const stats = await fs.stat(modifiedFile);
  await fs.utimes(modifiedFile, stats.atime, new Date());
  
  // Esegui il backup della nuova directory
  const modBackup2 = await mogu.backup(modTestDir2);
  console.log("Secondo backup creato:", modBackup2.hash);

  if (modBackup1.hash === modBackup2.hash) {
    throw new Error(
      'I backup dovrebbero essere diversi dopo la modifica del file\n' +
      `Primo hash: ${modBackup1.hash}\n` +
      `Secondo hash: ${modBackup2.hash}\n` +
      `Directory originale: ${modTestDir}\n` +
      `Nuova directory: ${modTestDir2}`
    );
  }
  
  // Ripristina e verifica il contenuto
  console.log("\nVerifica del contenuto ripristinato...");
  const modRestoreDir = path.join(RESTORE_DIR, 'mod-test');
  await fs.ensureDir(modRestoreDir);
  await mogu.restore(modBackup2.hash, modRestoreDir);
  
  const restoredContent = await fs.readFile(path.join(modRestoreDir, 'test.txt'), 'utf8');
  console.log("Contenuto ripristinato:", restoredContent);
  
  if (restoredContent !== 'Modified content') {
    throw new Error(
      'La cache non è stata aggiornata correttamente\n' +
      `Contenuto atteso: 'Modified content'\n` +
      `Contenuto trovato: '${restoredContent}'`
    );
  }

  console.log("Test del sistema di cache completati con successo!");
}

async function testCompare() {
  const mogu = new Mogu({
    storage: {
      service: 'PINATA',
      config: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      }
    },
    paths: {
      radata: RADATA_DIR,
      backup: TEST_DIR,
      restore: RESTORE_DIR,
      storage: path.join(process.cwd(), 'storage'),
      logs: path.join(process.cwd(), 'logs')
    },
    features: {
      useIPFS: false,
      useGun: false,
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm'
      }
    },
    performance: {
      maxConcurrent: 3,
      chunkSize: 1024 * 1024,
      cacheEnabled: false,
      cacheSize: 100
    }
  });

  try {
    // Test 1: Confronto con directory identica
    console.log("\nTest 1: Confronto con directory identica");
    const testDir = path.join(TEST_DIR, 'compare-test');
    
    // Assicurati che la directory sia vuota all'inizio
    await fs.emptyDir(testDir);
    await fs.ensureDir(testDir);

    // Crea file iniziali
    const initialFiles = {
      'file1.txt': 'Content 1',
      'file2.json': JSON.stringify({ data: 'test' }),
      'subdir/file3.txt': 'Content 3'
    };

    // Crea tutti i file
    for (const [filePath, content] of Object.entries(initialFiles)) {
      const fullPath = path.join(testDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
    }

    // Verifica che i file siano stati creati correttamente
    for (const [filePath, expectedContent] of Object.entries(initialFiles)) {
      const fullPath = path.join(testDir, filePath);
      const exists = await fs.pathExists(fullPath);
      if (!exists) {
        throw new Error(`File ${filePath} non creato correttamente`);
      }
      const content = await fs.readFile(fullPath, 'utf8');
      if (content !== expectedContent) {
        throw new Error(`Contenuto errato per ${filePath}. Atteso: ${expectedContent}, Trovato: ${content}`);
      }
    }

    console.log("File creati correttamente, eseguo il backup...");
    
    // Crea backup iniziale e verifica che sia completato
    let backupResult = null;
    let retries = 3;
    
    while (retries > 0) {
      const tempBackup = await mogu.backup(testDir);
      console.log("Backup creato con hash:", tempBackup.hash);
      
      // Aspetta un momento per assicurarsi che il backup sia completato
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verifica il backup ripristinandolo in una directory temporanea
      const tempRestoreDir = path.join(TEST_DIR, 'temp-restore');
      await fs.emptyDir(tempRestoreDir);
      
      try {
        await mogu.restore(tempBackup.hash, tempRestoreDir);
        console.log("Backup ripristinato, verifico i file...");
        
        // Verifica che tutti i file siano stati ripristinati correttamente
        let allFilesRestored = true;
        for (const [filePath, expectedContent] of Object.entries(initialFiles)) {
          const restoredPath = path.join(tempRestoreDir, filePath);
          console.log(`Verifico file: ${filePath}`);
          
          if (!await fs.pathExists(restoredPath)) {
            console.log(`File mancante: ${filePath}`);
            allFilesRestored = false;
            break;
          }
          
          const restoredContent = await fs.readFile(restoredPath, 'utf8');
          if (restoredContent !== expectedContent) {
            console.log(`Contenuto errato per ${filePath}`);
            console.log(`Atteso: ${expectedContent}`);
            console.log(`Trovato: ${restoredContent}`);
            allFilesRestored = false;
            break;
          }
          
          console.log(`File ${filePath} verificato correttamente`);
        }
        
        if (allFilesRestored) {
          console.log("Backup verificato correttamente");
          await fs.remove(tempRestoreDir);
          backupResult = tempBackup;
          break;
        } else {
          console.log("Verifica del backup fallita: alcuni file non sono stati ripristinati correttamente");
        }
      } catch (error) {
        console.log(`Tentativo di verifica backup fallito (${retries} tentativi rimasti):`, error);
      }
      
      retries--;
      if (retries > 0) {
        console.log(`Riprovo il backup (${retries} tentativi rimasti)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error('Impossibile creare un backup valido dopo 3 tentativi');
      }
    }

    if (!backupResult) {
      throw new Error('Backup non creato correttamente');
    }
    
    // Test confronto con directory identica
    const comparison = await mogu.compare(backupResult.hash, testDir);
    console.log("Risultato confronto:", JSON.stringify(comparison, null, 2));
    
    if (!comparison.isEqual) {
      throw new Error(
        'Le directory dovrebbero essere identiche.\n' +
        `Local hash: ${comparison.localVersion.hash}\n` +
        `Remote hash: ${comparison.remoteVersion.hash}\n` +
        `Local size: ${comparison.localVersion.size}\n` +
        `Remote size: ${comparison.remoteVersion.size}\n` +
        `Differenze complete: ${JSON.stringify(comparison, null, 2)}`
      );
    }
    
    // Test 2: Confronto con modifiche
    console.log("\nTest 2: Confronto con modifiche");
    
    // Aspetta un momento prima di modificare i file
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Modifica alcuni file
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'Modified content');
    await fs.writeFile(path.join(testDir, 'newfile.txt'), 'New content');
    await fs.remove(path.join(testDir, 'file2.json'));

    // Verifica che le modifiche siano state applicate
    const modifiedContent = await fs.readFile(path.join(testDir, 'file1.txt'), 'utf8');
    if (modifiedContent !== 'Modified content') {
      throw new Error('Modifica del file non riuscita');
    }

    // Test confronto dettagliato
    const detailedComparison = await mogu.compareDetailed(backupResult.hash, testDir);
    console.log("Risultato confronto dettagliato:", JSON.stringify(detailedComparison, null, 2));
    
    // Verifica le modifiche
    if (detailedComparison.isEqual) {
      throw new Error('Le directory non dovrebbero essere identiche dopo le modifiche');
    }

    if (detailedComparison.totalChanges.modified !== 1) {
      throw new Error(`Atteso 1 file modificato, trovati ${detailedComparison.totalChanges.modified}`);
    }

    if (detailedComparison.totalChanges.added !== 1) {
      throw new Error(`Atteso 1 file aggiunto, trovati ${detailedComparison.totalChanges.added}`);
    }

    if (detailedComparison.totalChanges.deleted !== 1) {
      throw new Error(`Atteso 1 file eliminato, trovati ${detailedComparison.totalChanges.deleted}`);
    }

    // Test 3: Confronto con directory vuota
    console.log("\nTest 3: Confronto con directory vuota");
    await fs.emptyDir(testDir);
    
    const emptyComparison = await mogu.compareDetailed(backupResult.hash, testDir);
    console.log("Risultato confronto directory vuota:", JSON.stringify(emptyComparison, null, 2));
    
    const expectedDeletedFiles = Object.keys(initialFiles).length;
    if (emptyComparison.totalChanges.deleted !== expectedDeletedFiles) {
      throw new Error(
        `Numero errato di file eliminati.\n` +
        `Attesi: ${expectedDeletedFiles}\n` +
        `Trovati: ${emptyComparison.totalChanges.deleted}\n` +
        `Dettagli: ${JSON.stringify(emptyComparison, null, 2)}`
      );
    }

    console.log("Test delle funzionalità di confronto completati con successo!");
  } catch (error) {
    console.error("Errore nei test di confronto:", error);
    throw error;
  }
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});