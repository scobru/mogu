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
const TEST_DIR = path_1.default.join(process.cwd(), 'test-files');
const RESTORE_DIR = path_1.default.join(process.cwd(), 'restored-files');
const RADATA_DIR = path_1.default.join(process.cwd(), 'test-radata');
const TEST_ENCRYPTION_KEY = 'test-encryption-key-123';
async function run() {
    try {
        console.log("Starting tests...");
        await fs_extra_1.default.ensureDir(TEST_DIR);
        await fs_extra_1.default.ensureDir(RESTORE_DIR);
        await fs_extra_1.default.ensureDir(RADATA_DIR);
        // Test file backup senza crittografia
        console.log("\n=== Testing File Backup (Unencrypted) ===");
        await testFileBackup(false);
        // Test file backup con crittografia
        console.log("\n=== Testing File Backup (Encrypted) ===");
        await testFileBackup(true);
        // Test backup della directory radata
        console.log("\n=== Testing Radata Directory Backup ===");
        await testRadataBackup();
        // Aggiungi il test del sistema di cache
        await testCacheSystem();
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
        await fs_extra_1.default.remove(RADATA_DIR).catch(() => { });
    }
}
async function testFileBackup(useEncryption) {
    const mogu = new mogu_1.Mogu({
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
            storage: path_1.default.join(process.cwd(), 'storage'),
            logs: path_1.default.join(process.cwd(), 'logs')
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
    const backup = await mogu.backup(TEST_DIR, backupOptions);
    console.log("Backup created:", backup.hash);
    // Rimuovi i file originali
    await fs_extra_1.default.emptyDir(TEST_DIR);
    // Test restore
    console.log("Restoring backup...");
    await mogu.restore(backup.hash, RESTORE_DIR, backupOptions);
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
            await mogu.restore(backup.hash, RESTORE_DIR, {
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
async function testRadataBackup() {
    try {
        // Assicurati che la directory esista
        await fs_extra_1.default.ensureDir(RADATA_DIR);
        // Crea un'istanza di Mogu
        const mogu = new mogu_1.Mogu({
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
                storage: path_1.default.join(process.cwd(), 'storage'),
                logs: path_1.default.join(process.cwd(), 'logs')
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
            await fs_extra_1.default.writeFile(path_1.default.join(RADATA_DIR, name), content);
        }
        // Backup della directory radata
        console.log("Creating radata backup...");
        const backup = await mogu.backup(RADATA_DIR);
        console.log("Radata backup created:", backup.hash);
        // Salva il contenuto originale della directory
        const originalFiles = await fs_extra_1.default.readdir(RADATA_DIR);
        const originalContents = new Map();
        for (const file of originalFiles) {
            const content = await fs_extra_1.default.readFile(path_1.default.join(RADATA_DIR, file));
            originalContents.set(file, content);
        }
        // Cancella completamente la directory radata
        console.log("Removing radata directory...");
        await fs_extra_1.default.remove(RADATA_DIR);
        // Verifica che la directory sia stata effettivamente cancellata
        const exists = await fs_extra_1.default.pathExists(RADATA_DIR);
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
        const restoredFiles = await fs_extra_1.default.readdir(RADATA_DIR);
        // Verifica che tutti i file originali siano presenti
        if (restoredFiles.length !== originalFiles.length) {
            throw new Error(`Number of files mismatch: expected ${originalFiles.length}, got ${restoredFiles.length}`);
        }
        // Verifica il contenuto di ogni file
        for (const file of restoredFiles) {
            const restoredContent = await fs_extra_1.default.readFile(path_1.default.join(RADATA_DIR, file));
            const originalContent = originalContents.get(file);
            if (!originalContent || !restoredContent.equals(originalContent)) {
                throw new Error(`Content mismatch in ${file}`);
            }
        }
        console.log("Radata backup test passed");
    }
    catch (error) {
        console.error("Error during radata test:", error);
        throw error;
    }
}
async function testCacheSystem() {
    console.log("\n=== Testing Cache System ===");
    const mogu = new mogu_1.Mogu({
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
            storage: path_1.default.join(process.cwd(), 'storage'),
            logs: path_1.default.join(process.cwd(), 'logs')
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
            cacheSize: 2 // Dimensione piccola per testare il limite
        }
    });
    // Test 1: Verifica caching dei file...
    console.log("Test 1: Verifica caching dei file...");
    // Creiamo una struttura di file più complessa
    const testDir = path_1.default.join(TEST_DIR, 'cache-test');
    await fs_extra_1.default.ensureDir(testDir);
    // Creiamo multipli file con contenuto significativo
    const numFiles = 10;
    const fileContent = 'Test content '.repeat(10000); // Circa 120KB per file
    console.log("Creazione files di test...");
    for (let i = 0; i < numFiles; i++) {
        await fs_extra_1.default.writeFile(path_1.default.join(testDir, `test-${i}.txt`), fileContent);
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
        await fs_extra_1.default.emptyDir(RESTORE_DIR);
        const startTime = Date.now();
        await mogu.restore(backup1.hash, RESTORE_DIR);
        const duration = Date.now() - startTime;
        totalTime1 += duration;
        console.log(`Test ${i + 1}: ${duration}ms`);
    }
    // Seconda serie di test (con cache)
    console.log("\nSeconda serie - con cache:");
    for (let i = 0; i < numTests; i++) {
        await fs_extra_1.default.emptyDir(RESTORE_DIR);
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
        throw new Error(`Il restore con cache non è significativamente più veloce\n` +
            `Primo restore: ${avgTime1.toFixed(2)}ms\n` +
            `Secondo restore: ${avgTime2.toFixed(2)}ms\n` +
            `Miglioramento: ${((avgTime1 - avgTime2) / avgTime1 * 100).toFixed(2)}%`);
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
        const dirPath = path_1.default.join(TEST_DIR, dir.name);
        await fs_extra_1.default.ensureDir(dirPath);
        await fs_extra_1.default.writeFile(path_1.default.join(dirPath, 'test.txt'), dir.content);
    }
    // Esegui backup e restore per ogni directory
    for (const dir of testDirs) {
        const dirPath = path_1.default.join(TEST_DIR, dir.name);
        const backup = await mogu.backup(dirPath);
        const restorePath = path_1.default.join(RESTORE_DIR, dir.name);
        await fs_extra_1.default.ensureDir(restorePath);
        await mogu.restore(backup.hash, restorePath);
        console.log(`Backup e restore completati per ${dir.name}`);
    }
    // Test 3: Verifica cache con file modificati
    console.log("\nTest 3: Verifica cache con file modificati...");
    // Crea una directory per il test di modifica
    const modTestDir = path_1.default.join(TEST_DIR, 'mod-test');
    await fs_extra_1.default.ensureDir(modTestDir);
    const modTestFile = path_1.default.join(modTestDir, 'test.txt');
    // Scrivi il contenuto iniziale
    console.log("Creazione file iniziale...");
    await fs_extra_1.default.writeFile(modTestFile, 'Initial content');
    const modBackup1 = await mogu.backup(modTestDir);
    console.log("Primo backup creato:", modBackup1.hash);
    // Aspetta un momento per assicurarsi che il timestamp sia diverso
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Modifica il file e forza l'invalidazione della cache
    console.log("\nModifica del file...");
    // Rinomina la directory per forzare un nuovo backup
    const modTestDir2 = path_1.default.join(TEST_DIR, 'mod-test-2');
    await fs_extra_1.default.move(modTestDir, modTestDir2);
    await fs_extra_1.default.writeFile(path_1.default.join(modTestDir2, 'test.txt'), 'Modified content');
    // Forza la modifica del timestamp del file
    const modifiedFile = path_1.default.join(modTestDir2, 'test.txt');
    const stats = await fs_extra_1.default.stat(modifiedFile);
    await fs_extra_1.default.utimes(modifiedFile, stats.atime, new Date());
    // Esegui il backup della nuova directory
    const modBackup2 = await mogu.backup(modTestDir2);
    console.log("Secondo backup creato:", modBackup2.hash);
    if (modBackup1.hash === modBackup2.hash) {
        throw new Error('I backup dovrebbero essere diversi dopo la modifica del file\n' +
            `Primo hash: ${modBackup1.hash}\n` +
            `Secondo hash: ${modBackup2.hash}\n` +
            `Directory originale: ${modTestDir}\n` +
            `Nuova directory: ${modTestDir2}`);
    }
    // Ripristina e verifica il contenuto
    console.log("\nVerifica del contenuto ripristinato...");
    const modRestoreDir = path_1.default.join(RESTORE_DIR, 'mod-test');
    await fs_extra_1.default.ensureDir(modRestoreDir);
    await mogu.restore(modBackup2.hash, modRestoreDir);
    const restoredContent = await fs_extra_1.default.readFile(path_1.default.join(modRestoreDir, 'test.txt'), 'utf8');
    console.log("Contenuto ripristinato:", restoredContent);
    if (restoredContent !== 'Modified content') {
        throw new Error('La cache non è stata aggiornata correttamente\n' +
            `Contenuto atteso: 'Modified content'\n` +
            `Contenuto trovato: '${restoredContent}'`);
    }
    console.log("Test del sistema di cache completati con successo!");
}
run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
