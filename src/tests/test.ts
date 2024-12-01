import { Mogu } from "../mogu";
import type { FileDiff } from '../versioning';
import type { BackupOptions } from '../types/backup';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

dotenv.config();

const TEST_DIR = path.join(process.cwd(), 'test-files');
const RESTORE_DIR = path.join(process.cwd(), 'restored-files');
const TEST_ENCRYPTION_KEY = 'test-encryption-key-123';

async function run() {
  try {
    console.log("Starting tests...");
    
    await fs.ensureDir(TEST_DIR);
    await fs.ensureDir(RESTORE_DIR);

    // Test file backup senza crittografia
    console.log("\n=== Testing File Backup (Unencrypted) ===");
    await testFileBackup(false);

    // Test file backup con crittografia
    console.log("\n=== Testing File Backup (Encrypted) ===");
    await testFileBackup(true);

    // Test Gun backup
    if (process.env.TEST_GUN) {
      console.log("\n=== Testing Gun Backup ===");
      const gunMogu = new Mogu({
        storageService: 'PINATA',
        storageConfig: {
          apiKey: process.env.PINATA_API_KEY || '',
          apiSecret: process.env.PINATA_API_SECRET || ''
        },
        useGun: true
      });
      await testGunBackup(gunMogu);
    }

    console.log("\nAll tests completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await fs.remove(TEST_DIR).catch(() => {});
    await fs.remove(RESTORE_DIR).catch(() => {});
  }
}

async function testFileBackup(useEncryption: boolean) {
  const mogu = new Mogu({
    storageService: 'PINATA',
    storageConfig: {
      apiKey: process.env.PINATA_API_KEY || '',
      apiSecret: process.env.PINATA_API_SECRET || ''
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
  const backup = await mogu.backupFiles(TEST_DIR, backupOptions);
  console.log("Backup created:", backup.hash);

  // Rimuovi i file originali
  await fs.emptyDir(TEST_DIR);

  // Test restore
  console.log("Restoring backup...");
  await mogu.restoreFiles(backup.hash, RESTORE_DIR, backupOptions);

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
      await mogu.restoreFiles(backup.hash, RESTORE_DIR, {
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

interface GunData {
  value: string;
}

async function testGunBackup(mogu: Mogu) {
  try {
    // Test backup non criptato
    console.log("\n=== Testing Unencrypted Gun Backup ===");
    await testGunBackupWithEncryption(mogu, false);

    // Test backup criptato
    console.log("\n=== Testing Encrypted Gun Backup ===");
    await testGunBackupWithEncryption(mogu, true);
  } catch (error) {
    console.error("Gun backup test failed:", error);
    throw error;
  }
}

async function testGunBackupWithEncryption(mogu: Mogu, useEncryption: boolean) {
  try {
    // Test Gun operations
    console.log("Testing Gun operations...");
    await mogu.put('test/key', { value: 'test-data' });
    
    // Aspetta che i dati siano scritti e verificali
    const getData = async (retries = 3): Promise<GunData> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkData = () => {
          mogu.get('test/key').on((data: GunData) => {
            console.log("Initial data check:", data);
            if (data && data.value === 'test-data') {
              resolve(data);
            } else if (++attempts < retries) {
              setTimeout(checkData, 1000);
            } else {
              reject(new Error('Failed to get correct initial data'));
            }
          });
        };
        checkData();
      });
    };

    const initialData = await getData();
    console.log("Initial data verified:", initialData);

    // Test backup
    console.log("Creating Gun backup...");
    const backupOptions: BackupOptions | undefined = useEncryption ? {
      encryption: {
        enabled: true,
        key: TEST_ENCRYPTION_KEY
      }
    } : undefined;

    const backup = await mogu.backupGun(undefined, backupOptions);
    console.log("Gun backup created:", backup.hash);

    // Modify data
    console.log("Modifying data...");
    await mogu.put('test/key', { value: 'modified-data' });

    // Verifica che la modifica sia avvenuta
    const verifyModified = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        mogu.get('test/key').on((data: GunData) => {
          console.log("Modified data check:", data);
          if (data && data.value === 'modified-data') {
            resolve();
          } else {
            setTimeout(() => reject(new Error('Failed to verify data modification')), 2000);
          }
        });
      });
    };

    await verifyModified();
    console.log("Data modification verified");

    // Test restore
    console.log("Restoring Gun backup...");
    let restored = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!restored && attempts < maxAttempts) {
      try {
        await mogu.restoreGun(backup.hash, undefined, backupOptions);
        
        // Verifica il ripristino
        const verifyData = await new Promise<boolean>((resolve, reject) => {
          mogu.get('test/key').once((data: GunData) => {
            console.log("Checking restored data:", data);
            if (data?.value === 'test-data') {
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });

        if (verifyData) {
          restored = true;
          console.log("Restore successful");
        } else {
          console.log(`Restore attempt ${attempts + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`Restore attempt ${attempts + 1} failed:`, error);
      }
      attempts++;
    }

    if (!restored) {
      throw new Error('Failed to restore after maximum attempts');
    }

    console.log("Gun backup test passed");

    // Test con chiave sbagliata se stiamo usando la crittografia
    if (useEncryption) {
      console.log("Testing restore with wrong key...");
      try {
        await mogu.restoreGun(backup.hash, undefined, {
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
  } catch (error) {
    console.error("Gun backup test failed:", error);
    throw error;
  }
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});