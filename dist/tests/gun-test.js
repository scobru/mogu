"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gun_1 = __importDefault(require("gun"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
require("../mogu");
dotenv_1.default.config();
const TEST_TIMEOUT = 30000;
async function runGunTests() {
    try {
        console.log("Starting Gun chain tests...");
        // Initialize Gun with test config
        const config = {
            storageService: 'PINATA',
            storageConfig: {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || ''
            },
            radataPath: path_1.default.join(process.cwd(), 'test-radata'),
            backupPath: path_1.default.join(process.cwd(), 'test-backup')
        };
        // Create test directories
        await fs_extra_1.default.ensureDir(config.radataPath);
        await fs_extra_1.default.ensureDir(config.backupPath);
        // Initialize Gun
        const gun = (0, gun_1.default)({ file: config.radataPath });
        // Test basic operations
        console.log("\nTesting basic operations...");
        await testBasicOperations(gun);
        // Test backup and restore
        console.log("\nTesting backup and restore...");
        await testBackupRestore(gun, config);
        console.log("\nAll Gun chain tests completed successfully!");
        process.exit(0);
    }
    catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
    finally {
        // Cleanup test directories
        await fs_extra_1.default.remove(path_1.default.join(process.cwd(), 'test-radata')).catch(() => { });
        await fs_extra_1.default.remove(path_1.default.join(process.cwd(), 'test-backup')).catch(() => { });
    }
}
async function testBasicOperations(gun) {
    // Test put/get
    await new Promise((resolve, reject) => {
        gun.get('test').put({ value: 'test-data' }, (ack) => {
            if (ack.err)
                reject(ack.err);
            gun.get('test').once((data) => {
                console.log('Retrieved data:', data);
                if (data.value === 'test-data') {
                    resolve();
                }
                else {
                    reject(new Error('Data mismatch'));
                }
            });
        });
    });
    // Test real-time updates
    await new Promise((resolve, reject) => {
        gun.get('test').on((data) => {
            console.log('Real-time update:', data);
            if (data.value === 'updated-data') {
                resolve();
            }
        });
        gun.get('test').put({ value: 'updated-data' }, (ack) => {
            if (ack.err)
                reject(ack.err);
        });
    });
}
async function testBackupRestore(gun, config) {
    try {
        // Create test data file
        const testFilePath = path_1.default.join(config.radataPath, 'test.json');
        await fs_extra_1.default.writeFile(testFilePath, JSON.stringify({ value: 'backup-data' }));
        // Create backup
        console.log("Creating backup...");
        const backupResult = await gun.backup(config);
        console.log("Backup created:", backupResult.hash);
        // Delete test data
        await fs_extra_1.default.remove(testFilePath);
        console.log("Test file deleted");
        // Restore from backup
        console.log("Restoring from backup...");
        const restored = await gun.get('test').restore(config, backupResult.hash);
        console.log("Restore completed:", restored);
        // Verify restored data
        const restoredContent = await fs_extra_1.default.readFile(testFilePath, 'utf8');
        const restoredData = JSON.parse(restoredContent);
        if (restoredData.value !== 'backup-data') {
            throw new Error('Restored data mismatch');
        }
        console.log('Backup and restore test passed');
    }
    catch (error) {
        console.error("Backup/restore test failed:", error);
        throw error;
    }
}
// Run tests
runGunTests().catch(console.error);
