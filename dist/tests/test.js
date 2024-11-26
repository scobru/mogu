"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mogu_1 = require("../mogu");
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const TEST_TIMEOUT = 30000;
const RADATA_PATH = path_1.default.join(process.cwd(), "radata");
async function run() {
    try {
        console.log("Starting tests...");
        // Test con IPFS disabilitato
        console.log("\n=== Running tests with IPFS disabled ===");
        const moguWithoutIPFS = new mogu_1.Mogu({
            storageService: 'PINATA',
            storageConfig: {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || ''
            },
            useIPFS: false
        });
        await runTests(moguWithoutIPFS, "without IPFS");
        // Test con IPFS abilitato
        console.log("\n=== Running tests with IPFS enabled ===");
        const moguWithIPFS = new mogu_1.Mogu({
            storageService: 'PINATA',
            storageConfig: {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || ''
            },
            useIPFS: true
        });
        await runTests(moguWithIPFS, "with IPFS");
        console.log("All tests completed successfully!");
        process.exit(0);
    }
    catch (err) {
        console.error("Test failed with error:", err);
        process.exit(1);
    }
}
async function runTests(mogu, testType) {
    try {
        console.log(`\nStarting basic operations test ${testType}...`);
        await testBasicOperations(mogu);
        console.log(`\nStarting backup test ${testType}...`);
        await testBackup(mogu);
        console.log(`\nStarting IPFS operations test ${testType}...`);
        await testIPFSOperations(mogu);
    }
    catch (err) {
        console.error(`Test failed:`, err);
        throw err;
    }
}
async function testBasicOperations(mogu) {
    // Test put
    console.log("Testing put operation...");
    await mogu.put('test/data1', { value: 'test1' });
    await mogu.put('test/data2', { value: 'test2' });
    // Test get
    console.log("Testing get operation...");
    const data1 = await mogu.get('test/data1');
    console.log('Retrieved data1:', data1);
    // Verifica dei dati
    if (!data1 || data1.value !== 'test1') {
        throw new Error('Data verification failed for test/data1');
    }
    // Test real-time updates
    console.log("Testing real-time updates...");
    const updatePromise = new Promise(resolve => {
        mogu.on('test/data1', (data) => {
            console.log('Data1 updated:', data);
            if (data.value === 'updated') {
                resolve();
            }
        });
    });
    // Aggiorna i dati
    await mogu.put('test/data1', { value: 'updated' });
    // Attendi l'aggiornamento
    await Promise.race([
        updatePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Update timeout')), 5000))
    ]);
}
async function testIPFSOperations(mogu) {
    console.log("Testing IPFS operations...");
    // Test di scrittura su IPFS
    const testData = { value: 'ipfs-test' };
    await mogu.put('ipfs-test', testData);
    // Test di lettura da IPFS
    const retrieved = await mogu.get('ipfs-test');
    console.log('Retrieved from IPFS:', retrieved);
    if (JSON.stringify(retrieved.value) !== JSON.stringify(testData.value)) {
        throw new Error('IPFS data verification failed');
    }
    // Test di aggiornamento su IPFS
    const updatedData = { value: 'ipfs-updated' };
    await mogu.put('ipfs-test', updatedData);
    const retrievedUpdated = await mogu.get('ipfs-test');
    if (JSON.stringify(retrievedUpdated.value) !== JSON.stringify(updatedData.value)) {
        throw new Error('IPFS update verification failed');
    }
}
async function testBackup(mogu) {
    // Salva alcuni dati di test
    const testData = {
        'test/1': { value: 'one' },
        'test/2': { value: 'two' },
        'test/nested/3': { value: 'three' }
    };
    // Inserisci i dati
    console.log("Inserting test data...");
    for (const [path, data] of Object.entries(testData)) {
        await mogu.put(path, data);
    }
    // Attendi che i dati siano scritti su disco
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Verifica che i file radata esistano
    try {
        await promises_1.default.access(RADATA_PATH);
        console.log('Radata directory exists:', RADATA_PATH);
    }
    catch (err) {
        throw new Error(`Radata directory not found at ${RADATA_PATH}`);
    }
    // Crea il backup
    console.log("Creating backup...");
    const backupResult = await mogu.backup();
    const backupHash = backupResult.hash;
    console.log('Backup created with hash:', backupHash);
    // Salva il contenuto originale dei file
    const originalFiles = new Map();
    const files = await promises_1.default.readdir(RADATA_PATH);
    for (const file of files) {
        const content = await promises_1.default.readFile(path_1.default.join(RADATA_PATH, file), 'utf8');
        originalFiles.set(file, content);
    }
    // Cancella la directory radata
    await promises_1.default.rm(RADATA_PATH, { recursive: true, force: true });
    console.log('Radata directory deleted');
    // Ripristina dal backup
    console.log("Restoring from backup...");
    const restoreResult = await mogu.restore(backupHash);
    console.log('Backup restored:', restoreResult);
    // Attendi che i file siano ripristinati
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Verifica che i file siano stati ripristinati correttamente
    console.log("Verifying restored files...");
    const restoredFiles = new Map();
    const newFiles = await promises_1.default.readdir(RADATA_PATH);
    for (const file of newFiles) {
        const content = await promises_1.default.readFile(path_1.default.join(RADATA_PATH, file), 'utf8');
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
    console.log("Verifying data accessibility...");
    for (const [path, data] of Object.entries(testData)) {
        const restored = await mogu.get(path);
        console.log(`Original data at ${path}:`, data);
        console.log(`Restored data at ${path}:`, restored);
        if (JSON.stringify(restored.value) !== JSON.stringify(data.value)) {
            throw new Error(`Data mismatch at ${path}`);
        }
    }
    console.log('Backup and restore verified successfully');
    // Test di confronto backup
    console.log('Testing backup comparison...');
    // Prima verifica: dovrebbe essere uguale
    const comparison1 = await mogu.compareBackup(backupHash);
    console.log('Initial comparison:', comparison1);
    if (!comparison1.isEqual) {
        console.error('Comparison details:', comparison1.differences);
        throw new Error('Backup should be equal after restore');
    }
    // Salva lo stato originale prima delle modifiche
    const originalState = await mogu.getBackupState(backupHash);
    // Crea un nuovo file per il test
    const testFile = '!';
    const filePath = path_1.default.join(RADATA_PATH, testFile);
    try {
        // Modifica il file
        await promises_1.default.writeFile(filePath, JSON.stringify({ modified: true }));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendi che la modifica sia scritta
        // Seconda verifica: dovrebbe essere diverso
        const comparison2 = await mogu.compareBackup(backupHash);
        console.log('Comparison after modification:', comparison2);
        if (comparison2.isEqual) {
            throw new Error('Backup should be different after local modification');
        }
        // Ripristina lo stato originale completamente
        await mogu.restore(backupHash);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Attendi che il ripristino sia completo
    }
    catch (err) {
        console.error(`Error during file operations:`, err);
        throw err;
    }
    // Verifica finale dopo il ripristino
    const comparison3 = await mogu.compareBackup(backupHash);
    console.log('Final comparison:', comparison3);
    if (!comparison3.isEqual) {
        console.error('Final comparison details:', comparison3.differences);
        throw new Error('Backup should be equal after content restore');
    }
    console.log('Backup comparison tests completed successfully');
    // Test del diff dettagliato
    console.log('Testing detailed backup comparison...');
    // Test iniziale del diff dettagliato
    const detailedComparison1 = await mogu.compareDetailedBackup(backupHash);
    console.log('Initial detailed comparison:', {
        isEqual: detailedComparison1.isEqual,
        totalChanges: detailedComparison1.totalChanges
    });
    // Crea e modifica file per il test del diff
    const modifications = [
        { file: '!', content: JSON.stringify({ modified: true }) },
        { file: 'test.txt', content: 'new file' }
    ];
    // Applica le modifiche
    for (const mod of modifications) {
        const modFilePath = path_1.default.join(RADATA_PATH, mod.file);
        await promises_1.default.writeFile(modFilePath, mod.content);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendi che le modifiche siano scritte
    // Verifica che il diff rilevi correttamente le modifiche
    const detailedComparison2 = await mogu.compareDetailedBackup(backupHash);
    console.log('Detailed comparison after modifications:', {
        isEqual: detailedComparison2.isEqual,
        totalChanges: detailedComparison2.totalChanges,
        differences: detailedComparison2.differences
    });
    // Verifica che le modifiche siano state rilevate correttamente
    if (detailedComparison2.isEqual) {
        throw new Error('Backup should detect differences after modifications');
    }
    if (detailedComparison2.totalChanges.modified < 1 ||
        detailedComparison2.totalChanges.added < 1) {
        throw new Error('Backup comparison should detect both modified and added files');
    }
    // Verifica che ogni modifica sia stata tracciata correttamente
    const modifiedFiles = detailedComparison2.differences
        .filter((d) => d.type === 'modified')
        .map((d) => d.path);
    const addedFiles = detailedComparison2.differences
        .filter((d) => d.type === 'added')
        .map((d) => d.path);
    console.log('Modified files:', modifiedFiles);
    console.log('Added files:', addedFiles);
    // Ripristina i file originali
    await mogu.restore(backupHash);
    // Verifica finale del diff
    const detailedComparison3 = await mogu.compareDetailedBackup(backupHash);
    if (!detailedComparison3.isEqual) {
        console.error('Final comparison differences:', detailedComparison3.differences);
        throw new Error('Backup should be equal after restore');
    }
    console.log('Detailed backup comparison tests completed successfully');
}
run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
