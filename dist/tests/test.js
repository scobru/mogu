"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mogu_1 = require("../mogu");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const TEST_TIMEOUT = 30000;
const TEST_DIR = path_1.default.join(process.cwd(), 'test-files');
const RESTORE_DIR = path_1.default.join(process.cwd(), 'restored-files');
const TEST_ENCRYPTION_KEY = 'test-encryption-key-123';
async function run() {
    try {
        console.log("Starting tests...");
        await fs_extra_1.default.ensureDir(TEST_DIR);
        await fs_extra_1.default.ensureDir(RESTORE_DIR);
        // Test file backup senza crittografia
        console.log("\n=== Testing File Backup (Unencrypted) ===");
        await testFileBackup(false);
        // Test file backup con crittografia
        console.log("\n=== Testing File Backup (Encrypted) ===");
        await testFileBackup(true);
        // Test Gun backup
        if (process.env.TEST_GUN) {
            console.log("\n=== Testing Gun Backup ===");
            const gunMogu = new mogu_1.Mogu({
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
    }
    catch (err) {
        console.error("Test failed with error:", err);
        process.exit(1);
    }
    finally {
        await fs_extra_1.default.remove(TEST_DIR).catch(() => { });
        await fs_extra_1.default.remove(RESTORE_DIR).catch(() => { });
    }
}
async function testFileBackup(useEncryption) {
    const mogu = new mogu_1.Mogu({
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
        await fs_extra_1.default.writeFile(path_1.default.join(TEST_DIR, name), content);
    }
    // Opzioni di backup
    const backupOptions = useEncryption ? {
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
    await fs_extra_1.default.emptyDir(TEST_DIR);
    // Test restore
    console.log("Restoring backup...");
    await mogu.restoreFiles(backup.hash, RESTORE_DIR, backupOptions);
    // Verifica file ripristinati
    for (const [name, originalContent] of Object.entries(testFiles)) {
        const restoredPath = path_1.default.join(RESTORE_DIR, name);
        const restoredContent = await fs_extra_1.default.readFile(restoredPath);
        // Confronta il contenuto in base al tipo di file
        if (name.endsWith('.png')) {
            // Per i file binari, confronta i buffer
            if (!Buffer.from(originalContent).equals(restoredContent)) {
                throw new Error(`Binary content mismatch in ${name}`);
            }
        }
        else {
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
        }
        catch (error) {
            if (!(error instanceof Error) || !error.message.includes('decrypt')) {
                throw error;
            }
            console.log("Restore with wrong key failed as expected");
        }
    }
    console.log(`File backup test ${useEncryption ? '(encrypted)' : '(unencrypted)'} passed`);
}
async function testGunBackup(mogu) {
    try {
        // Test backup non criptato
        console.log("\n=== Testing Unencrypted Gun Backup ===");
        await testGunBackupWithEncryption(mogu, false);
        // Test backup criptato
        console.log("\n=== Testing Encrypted Gun Backup ===");
        await testGunBackupWithEncryption(mogu, true);
    }
    catch (error) {
        console.error("Gun backup test failed:", error);
        throw error;
    }
}
async function testGunBackupWithEncryption(mogu, useEncryption) {
    try {
        // Test Gun operations
        console.log("Testing Gun operations...");
        await mogu.put('test/key', { value: 'test-data' });
        // Aspetta che i dati siano scritti e verificali
        const getData = async (retries = 3) => {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const checkData = () => {
                    mogu.get('test/key').on((data) => {
                        console.log("Initial data check:", data);
                        if (data && data.value === 'test-data') {
                            resolve(data);
                        }
                        else if (++attempts < retries) {
                            setTimeout(checkData, 1000);
                        }
                        else {
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
        const backupOptions = useEncryption ? {
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
        const verifyModified = async () => {
            return new Promise((resolve, reject) => {
                mogu.get('test/key').on((data) => {
                    console.log("Modified data check:", data);
                    if (data && data.value === 'modified-data') {
                        resolve();
                    }
                    else {
                        setTimeout(() => reject(new Error('Failed to verify data modification')), 2000);
                    }
                });
            });
        };
        await verifyModified();
        console.log("Data modification verified");
        // Test restore
        console.log("Restoring Gun backup...");
        await mogu.restoreGun(backup.hash, undefined, backupOptions);
        console.log("Restore completed, waiting for sync...");
        // Aspetta che il restore sia completato e verifica con retry
        const verifyRestore = async (retries = 10) => {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const checkRestore = () => {
                    mogu.get('test/key').off(); // Rimuovi i vecchi listener
                    mogu.get('test/key').on((data) => {
                        console.log(`Restore check attempt ${attempts + 1}/${retries}:`, data);
                        if (!data) {
                            console.log('Data is null, waiting...');
                            if (++attempts < retries) {
                                setTimeout(checkRestore, 2000);
                            }
                            else {
                                reject(new Error('Data is null after retries'));
                            }
                            return;
                        }
                        if (data.value === 'test-data') {
                            resolve();
                        }
                        else if (++attempts < retries) {
                            console.log(`Waiting for restore... (${attempts}/${retries})`);
                            setTimeout(checkRestore, 2000);
                        }
                        else {
                            reject(new Error(`Restore failed: expected 'test-data', got '${data?.value}'`));
                        }
                    });
                };
                setTimeout(checkRestore, 2000); // Aspetta prima del primo check
            });
        };
        await verifyRestore();
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
            }
            catch (error) {
                if (!(error instanceof Error) || !error.message.includes('decrypt')) {
                    throw error;
                }
                console.log("Restore with wrong key failed as expected");
            }
        }
    }
    catch (error) {
        console.error("Gun backup test failed:", error);
        throw error;
    }
}
run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
