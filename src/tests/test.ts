import { Mogu } from "../mogu";
import type { FileDiff } from '../versioning';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const TEST_TIMEOUT = 30000;

async function run() {
  try {
    console.log("Starting tests...");
    
    // Test with IPFS disabled
    console.log("\n=== Running tests with IPFS disabled ===");
    const moguWithoutIPFS = new Mogu({
      storageService: 'PINATA',
      storageConfig: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      },
      useIPFS: false
    });
    await runTests(moguWithoutIPFS, "without IPFS");

    // Test with IPFS enabled
    console.log("\n=== Running tests with IPFS enabled ===");
    const moguWithIPFS = new Mogu({
      storageService: 'PINATA',
      storageConfig: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      },
      useIPFS: true,
      backupPath: path.join(process.cwd(), 'backup'),
      radataPath: path.join(process.cwd(), 'radata'),
      restorePath: path.join(process.cwd(), 'restore')
    });
    await runTests(moguWithIPFS, "with IPFS");

    console.log("All tests completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

async function runTests(mogu: Mogu, testType: string) {
  try {
    console.log(`\nStarting basic operations test ${testType}...`);
    await testBasicOperations(mogu);
    
    console.log(`\nStarting backup test ${testType}...`);
    await testBackup(mogu);

    console.log(`\nStarting IPFS operations test ${testType}...`);
    await testIPFSOperations(mogu);

  } catch (err) {
    console.error(`Test failed:`, err);
    throw err;
  }
}

async function testBasicOperations(mogu: Mogu) {
  // Test put
  console.log("Testing put operation...");
  await mogu.put('test/data1', { value: 'test1' });
  await mogu.put('test/data2', { value: 'test2' });
  
  // Test get
  console.log("Testing get operation...");
  const data1 = await mogu.get('test/data1');
  console.log('Retrieved data1:', data1);
  
  // Data verification
  if (!data1 || data1.value !== 'test1') {
    throw new Error('Data verification failed for test/data1');
  }
  
  // Test real-time updates
  console.log("Testing real-time updates...");
  const updatePromise = new Promise<void>(resolve => {
    mogu.on('test/data1', (data: any) => {
      console.log('Data1 updated:', data);
      if (data.value === 'updated') {
        resolve();
      }
    });
  });

  // Update data
  await mogu.put('test/data1', { value: 'updated' });
  
  // Wait for update
  await Promise.race([
    updatePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Update timeout')), 5000))
  ]);
}

async function testIPFSOperations(mogu: Mogu) {
  console.log("Testing IPFS operations...");
  
  // Test of writing to IPFS
  const testData = { value: 'ipfs-test' };
  await mogu.put('ipfs-test', testData);
  
  // Test of reading from IPFS
  const retrieved = await mogu.get('ipfs-test');
  console.log('Retrieved from IPFS:', retrieved);
  
  if (JSON.stringify(retrieved.value) !== JSON.stringify(testData.value)) {
    throw new Error('IPFS data verification failed');
  }
  
  // Test of updating on IPFS
  const updatedData = { value: 'ipfs-updated' };
  await mogu.put('ipfs-test', updatedData);
  
  const retrievedUpdated = await mogu.get('ipfs-test');
  if (JSON.stringify(retrievedUpdated.value) !== JSON.stringify(updatedData.value)) {
    throw new Error('IPFS update verification failed');
  }
}

async function testBackup(mogu: Mogu) {
  try {
    // Save test data
    const testData = {
      'test/1': { value: 'one' },
      'test/2': { value: 'two' },
      'test/nested/3': { value: 'three' }
    };

    // Insert data
    console.log("Inserting test data...");
    for (const [path, data] of Object.entries(testData)) {
      await mogu.put(path, data);
    }

    // Wait for data to be written to disk
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify radata directory exists
    try {
      await fs.access(mogu.config.radataPath);
      console.log('Radata directory exists:', mogu.config.radataPath);
    } catch (err) {
      throw new Error(`Radata directory not found at ${mogu.config.radataPath}`);
    }

    // Create backup
    console.log("Creating backup...");
    const backupResult = await mogu.backup();
    const backupHash = backupResult.hash;
    console.log('Backup created with hash:', backupHash);

    // Save original file content
    const originalFiles = new Map();
    const files = await fs.readdir(mogu.config.radataPath);
    for (const file of files) {
      const content = await fs.readFile(path.join(mogu.config.radataPath, file), 'utf8');
      originalFiles.set(file, content);
    }

    // Delete radata directory
    await fs.rm(mogu.config.radataPath, { recursive: true, force: true });
    console.log('Radata directory deleted');

    // Restore from backup
    console.log("Restoring from backup...");
    const restoreResult = await mogu.restore(backupHash);
    console.log('Backup restored:', restoreResult);
    
    // Wait for files to be restored
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify restored files
    console.log("Verifying restored files...");
    const restoredFiles = new Map();
    const newFiles = await fs.readdir(mogu.config.radataPath);

    // Wait to ensure all files are written
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (const file of newFiles) {
      // Skip backup files during verification
      if (file.startsWith('backup_')) continue;
      
      const content = await fs.readFile(path.join(mogu.config.radataPath, file), 'utf8');
      restoredFiles.set(file, content);
    }

    // Compare original files with restored ones
    for (const [file, content] of originalFiles) {
      // Skip backup files during comparison
      if (file.startsWith('backup_')) continue;

      if (!restoredFiles.has(file)) {
        console.error('Files in backup:', Array.from(originalFiles.keys()).filter(f => !f.startsWith('backup_')));
        console.error('Restored files:', Array.from(restoredFiles.keys()));
        throw new Error(`Missing restored file: ${file}`);
      }
      
      const restoredContent = restoredFiles.get(file);
      try {
        // Try to parse both contents as JSON for accurate comparison
        const originalJson = JSON.parse(content);
        const restoredJson = JSON.parse(restoredContent);
        if (JSON.stringify(originalJson) !== JSON.stringify(restoredJson)) {
          throw new Error(`Content mismatch in file: ${file}`);
        }
      } catch {
        // If JSON parsing fails, compare strings directly
        if (restoredContent !== content) {
          throw new Error(`Content mismatch in file: ${file}`);
        }
      }
    }

    // Verify data accessibility through Gun
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

    // Backup comparison test
    console.log('Testing backup comparison...');
    
    // First verification: should be equal
    const comparison1 = await mogu.compareBackup(backupHash);
    console.log('Initial comparison:', comparison1);
    if (!comparison1.isEqual) {
      console.error('Comparison details:', comparison1.differences);
      throw new Error('Backup should be equal after restore');
    }

    // Save original state before modifications
    const originalState = await mogu.getBackupState(backupHash);

    // Create a new file for the test
    const testFile = 'test_mod';
    const filePath = path.join(mogu.config.radataPath, testFile);
    
    try {
      // Modify the file
      await fs.writeFile(filePath, JSON.stringify({ modified: true }));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second verification: should be different
      const comparison2 = await mogu.compareBackup(backupHash);
      console.log('Comparison after modification:', comparison2);
      if (comparison2.isEqual) {
        throw new Error('Backup should be different after local modification');
      }

      // Restore original state completely
      await mogu.restore(backupHash);
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (err) {
      console.error(`Error during file operations:`, err);
      throw err;
    } finally {
      // Cleanup test files
      try {
        await fs.unlink(filePath).catch(() => {});
      } catch (err) {
        console.warn('Could not cleanup test file:', err);
      }
    }

    // Final verification after restore
    const comparison3 = await mogu.compareBackup(backupHash);
    console.log('Final comparison:', comparison3);
    if (!comparison3.isEqual) {
      console.error('Final comparison details:', comparison3.differences);
      throw new Error('Backup should be equal after content restore');
    }

    console.log('Backup comparison tests completed successfully');

    // Detailed backup comparison test
    console.log('Testing detailed backup comparison...');
    
    // Initial detailed comparison
    const detailedComparison1 = await mogu.compareDetailedBackup(backupHash);
    console.log('Initial detailed comparison:', {
      isEqual: detailedComparison1.isEqual,
      totalChanges: detailedComparison1.totalChanges
    });

    // Modify an existing file and add a new file
    const existingFile = '!'; // One of the existing files
    const newFile = 'test.txt';

    // Modify the existing file
    await fs.writeFile(
      path.join(mogu.config.radataPath, existingFile), 
      JSON.stringify({ modified: true })
    );

    // Add a new file
    await fs.writeFile(
      path.join(mogu.config.radataPath, newFile),
      'new file'
    );

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for modifications to be written

    // Verify that the diff correctly detects changes
    const detailedComparison2 = await mogu.compareDetailedBackup(backupHash);
    console.log('Detailed comparison after modifications:', {
      isEqual: detailedComparison2.isEqual,
      totalChanges: detailedComparison2.totalChanges,
      differences: detailedComparison2.differences
    });

    // Verify that changes are correctly detected
    if (detailedComparison2.isEqual) {
      throw new Error('Backup should detect differences after modifications');
    }

    // Verify that there is at least one modification and one addition
    const hasModified = detailedComparison2.differences.some(d => d.type === 'modified');
    const hasAdded = detailedComparison2.differences.some(d => d.type === 'added');

    if (!hasModified || !hasAdded) {
      console.error('Changes detected:', {
        modified: detailedComparison2.totalChanges.modified,
        added: detailedComparison2.totalChanges.added,
        differences: detailedComparison2.differences
      });
      throw new Error('Backup comparison should detect both modified and added files');
    }

    // Verify that each modification is correctly tracked
    const modifiedFiles = detailedComparison2.differences
      .filter((d: FileDiff) => d.type === 'modified')
      .map((d: FileDiff) => d.path);

    const addedFiles = detailedComparison2.differences
      .filter((d: FileDiff) => d.type === 'added')
      .map((d: FileDiff) => d.path);

    console.log('Modified files:', modifiedFiles);
    console.log('Added files:', addedFiles);

    // Verify specific files modified and added
    if (!modifiedFiles.includes(existingFile)) {
      throw new Error(`Modified file ${existingFile} not detected`);
    }

    if (!addedFiles.includes(newFile)) {
      throw new Error(`Added file ${newFile} not detected`);
    }

    // Restore original files
    await mogu.restore(backupHash);

    // Final verification of the diff
    const detailedComparison3 = await mogu.compareDetailedBackup(backupHash);
    if (!detailedComparison3.isEqual) {
      console.error('Final comparison differences:', detailedComparison3.differences);
      throw new Error('Backup should be equal after restore');
    }

    console.log('Detailed backup comparison tests completed successfully');
  } catch (err) {
    console.error('Test backup failed:', err);
    throw err;
  } finally {
    // Cleanup all test files
    try {
      const modifications = [
        { file: 'test_mod', content: JSON.stringify({ modified: true }) },
        { file: 'test.txt', content: 'new file' }
      ];
      
      for (const mod of modifications) {
        const modFilePath = path.join(mogu.config.radataPath, mod.file);
        await fs.unlink(modFilePath).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('Error during cleanup:', cleanupErr);
    }
  }
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});