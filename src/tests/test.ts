import { Mogu } from "../mogu";
import type { FileDiff } from '../versioning';
import type { BackupOptions } from '../types/backup';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

dotenv.config();

const TEST_DIR = path.join(process.cwd(), 'test-files');
const RESTORE_DIR = path.join(process.cwd(), 'test-restored');
const STORAGE_DIR = path.join(process.cwd(), 'test-storage');
const TEST_ENCRYPTION_KEY = 'test-encryption-key-123';

// Configurazione base di Mogu per i test
const baseConfig = {
  storage: {
    service: 'PINATA' as const,
    config: {
      pinataJwt: process.env.PINATA_JWT || '',
      pinataGateway: process.env.PINATA_GATEWAY || ''
    }
  },
  paths: {
    backup: TEST_DIR,
    restore: RESTORE_DIR,
    storage: STORAGE_DIR,
    logs: path.join(process.cwd(), 'logs')
  },
  features: {
    encryption: {
      enabled: false,
      algorithm: 'aes-256-gcm'
    },
    useIPFS: false
  },
  performance: {
    chunkSize: 1024 * 1024, // 1MB
    maxConcurrent: 3,
    cacheEnabled: true,
    cacheSize: 100
  }
};

async function run() {
  try {
    console.log("Starting tests...");
    
    await fs.ensureDir(TEST_DIR);
    await fs.ensureDir(RESTORE_DIR);
    await fs.ensureDir(STORAGE_DIR);

    // Test file backup without encryption
    console.log("\n=== Testing File Backup (Unencrypted) ===");
    await testFileBackup(false);

    // Test file backup with encryption
    console.log("\n=== Testing File Backup (Encrypted) ===");
    await testFileBackup(true);

    // Test cache system
    console.log("\n=== Testing Cache System ===");
    await testCacheSystem();

    // Test comparison features
    console.log("\n=== Testing Compare Features ===");
    await testCompare();

    // Test versioning system
    console.log("\n=== Testing Versioning System ===");
    await testVersioning();

    // Test delete functionality
    console.log("\n=== Testing Delete Functionality ===");
    await testDelete();

    console.log("\nAll tests completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await fs.remove(TEST_DIR).catch(() => {});
    await fs.remove(RESTORE_DIR).catch(() => {});
    await fs.remove(STORAGE_DIR).catch(() => {});
  }
}

async function testFileBackup(useEncryption: boolean) {
  const mogu = new Mogu({
    ...baseConfig,
    features: {
      ...baseConfig.features,
      encryption: {
        ...baseConfig.features.encryption,
        enabled: useEncryption
      }
    }
  });

  // Create test files
  const testFiles = {
    'test.txt': 'Hello World',
    'data.json': JSON.stringify({ test: 'data' }),
    'image.png': Buffer.from('fake-image-data')
  };

  // Write test files
  for (const [name, content] of Object.entries(testFiles)) {
    await fs.writeFile(path.join(TEST_DIR, name), content);
  }

  // Backup options
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

  // Remove original files
  await fs.emptyDir(TEST_DIR);

  // Test restore
  console.log("Restoring backup...");
  await mogu.restore(backup.hash, RESTORE_DIR, backupOptions);

  // Verify restored files
  for (const [name, originalContent] of Object.entries(testFiles)) {
    const restoredPath = path.join(RESTORE_DIR, name);
    const restoredContent = await fs.readFile(restoredPath);
    
    // Compare content based on file type
    if (name.endsWith('.png')) {
      // For binary files, compare buffers
      if (!Buffer.from(originalContent).equals(restoredContent)) {
        throw new Error(`Binary content mismatch in ${name}`);
      }
    } else {
      // For text files, compare strings
      if (restoredContent.toString() !== originalContent) {
        throw new Error(`Content mismatch in ${name}`);
      }
    }
  }

  // Test restore with wrong key if we are using encryption
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

async function testCacheSystem() {
  const mogu = new Mogu({
    ...baseConfig,
    performance: {
      ...baseConfig.performance,
      cacheSize: 2  // Dimensione piccola per testare il limite
    }
  });

  console.log("\n=== Testing Cache System ===");
  
  // Test 1: Verify file caching
  console.log("Test 1: Verify file caching...");
  
  // Create a more complex file structure
  const testDir = path.join(TEST_DIR, 'cache-test');
  await fs.ensureDir(testDir);
  
  // Create multiple files with significant content
  const numFiles = 10;
  const fileContent = 'Test content '.repeat(10000); // About 120KB per file
  
  console.log("Creating test files...");
  for (let i = 0; i < numFiles; i++) {
    await fs.writeFile(path.join(testDir, `test-${i}.txt`), fileContent);
  }
  
  const backup1 = await mogu.backup(testDir);
  console.log("First backup created:", backup1.hash);
  
  // Perform multiple restores to get average times
  const numTests = 3;
  let totalTime1 = 0;
  let totalTime2 = 0;

  console.log("Running multiple restore tests...");
  
  // First test series (without cache)
  console.log("\nFirst series - without cache:");
  for (let i = 0; i < numTests; i++) {
    await fs.emptyDir(RESTORE_DIR);
    const startTime = Date.now();
    await mogu.restore(backup1.hash, RESTORE_DIR);
    const duration = Date.now() - startTime;
    totalTime1 += duration;
    console.log(`Test ${i + 1}: ${duration}ms`);
  }

  // Second test series (with cache)
  console.log("\nSecond series - with cache:");
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

  console.log(`\nAverage time first restore (without cache): ${avgTime1.toFixed(2)} ms`);
  console.log(`Average time second restore (with cache): ${avgTime2.toFixed(2)} ms`);
  console.log(`Difference: ${(avgTime1 - avgTime2).toFixed(2)} ms (${((avgTime1 - avgTime2) / avgTime1 * 100).toFixed(2)}%)`);

  // Verify that the second time is at least 95% of the first
  if (avgTime2 > avgTime1 * 0.95) {
    throw new Error(
      `Cache restore is not significantly faster\n` +
      `First restore: ${avgTime1.toFixed(2)}ms\n` +
      `Second restore: ${avgTime2.toFixed(2)}ms\n` +
      `Improvement: ${((avgTime1 - avgTime2) / avgTime1 * 100).toFixed(2)}%`
    );
  }

  // Test 2: Verify cache limit
  console.log("\nTest 2: Verify cache limit...");
  
  // Create a directory for each test
  const testDirs = [
    { name: 'cache-test1', content: 'Content 1' },
    { name: 'cache-test2', content: 'Content 2' },
    { name: 'cache-test3', content: 'Content 3' }
  ];

  // Create test directories and files
  for (const dir of testDirs) {
    const dirPath = path.join(TEST_DIR, dir.name);
    await fs.ensureDir(dirPath);
    await fs.writeFile(path.join(dirPath, 'test.txt'), dir.content);
  }

  // Perform backup and restore for each directory
  for (const dir of testDirs) {
    const dirPath = path.join(TEST_DIR, dir.name);
    const backup = await mogu.backup(dirPath);
    const restorePath = path.join(RESTORE_DIR, dir.name);
    await fs.ensureDir(restorePath);
    await mogu.restore(backup.hash, restorePath);
    console.log(`Backup and restore completed for ${dir.name}`);
  }

  // Test 3: Verify cache with modified files
  console.log("\nTest 3: Verify cache with modified files...");
  
  // Create a directory for modification test
  const modTestDir = path.join(TEST_DIR, 'mod-test');
  await fs.ensureDir(modTestDir);
  const modTestFile = path.join(modTestDir, 'test.txt');
  
  // Write initial content
  console.log("Creating initial file...");
  await fs.writeFile(modTestFile, 'Initial content');
  const modBackup1 = await mogu.backup(modTestDir);
  console.log("First backup created:", modBackup1.hash);
  
  // Wait a moment to ensure different timestamp
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Modify file and force cache invalidation
  console.log("\nModifying file...");
  
  // Rename directory to force new backup
  const modTestDir2 = path.join(TEST_DIR, 'mod-test-2');
  await fs.move(modTestDir, modTestDir2);
  await fs.writeFile(path.join(modTestDir2, 'test.txt'), 'Modified content');
  
  // Force file timestamp modification
  const modifiedFile = path.join(modTestDir2, 'test.txt');
  const stats = await fs.stat(modifiedFile);
  await fs.utimes(modifiedFile, stats.atime, new Date());
  
  // Perform backup of new directory
  const modBackup2 = await mogu.backup(modTestDir2);
  console.log("Second backup created:", modBackup2.hash);
  
  if (modBackup1.hash === modBackup2.hash) {
    throw new Error(
      'Backups should be different after file modification\n' +
      `First hash: ${modBackup1.hash}\n` +
      `Second hash: ${modBackup2.hash}\n` +
      `Original directory: ${modTestDir}\n` +
      `New directory: ${modTestDir2}`
    );
  }
  
  // Restore and verify content
  console.log("\nVerifying restored content...");
  const modRestoreDir = path.join(RESTORE_DIR, 'mod-test');
  await fs.ensureDir(modRestoreDir);
  await mogu.restore(modBackup2.hash, modRestoreDir);
  
  const restoredContent = await fs.readFile(path.join(modRestoreDir, 'test.txt'), 'utf8');
  console.log("Restored content:", restoredContent);
  
  if (restoredContent !== 'Modified content') {
    throw new Error(
      'Cache was not updated correctly\n' +
      `Expected content: 'Modified content'\n` +
      `Found content: '${restoredContent}'`
    );
  }

  console.log("Cache system tests completed successfully!");
}

async function testCompare() {
  const mogu = new Mogu(baseConfig);

  try {
    // Test 1: Compare identical directories
    console.log("\nTest 1: Compare identical directories");
    const testDir = path.join(TEST_DIR, 'compare-test');
    
    // Make sure the directory is empty at the start
    await fs.emptyDir(testDir);
    await fs.ensureDir(testDir);

    // Create initial files
    const initialFiles = {
      'file1.txt': 'Content 1',
      'file2.json': JSON.stringify({ data: 'test' }),
      'subdir/file3.txt': 'Content 3'
    };

    // Create all necessary directories first
    const directories = new Set(
      Object.keys(initialFiles)
        .map(filePath => path.dirname(filePath))
        .filter(dir => dir !== '.')
    );

    for (const dir of directories) {
      const fullDirPath = path.join(testDir, dir);
      console.log(`Creating directory: ${fullDirPath}`);
      await fs.ensureDir(fullDirPath);
    }

    // Create all files
    for (const [filePath, content] of Object.entries(initialFiles)) {
      const fullPath = path.join(testDir, filePath);
      console.log(`Creating file: ${fullPath}`);
      await fs.writeFile(fullPath, content);
    }

    // Verify original directory structure
    const originalFiles = await fs.readdir(testDir, { recursive: true, withFileTypes: true });
    console.log("Original directory structure:");
    originalFiles.forEach(file => {
      console.log(`- ${file.isDirectory() ? '[DIR]' : '[FILE]'} ${file.name}`);
    });

    // Verify that files were created correctly
    for (const [filePath, expectedContent] of Object.entries(initialFiles)) {
      const fullPath = path.join(testDir, filePath);
      const exists = await fs.pathExists(fullPath);
      if (!exists) {
        throw new Error(`File ${filePath} was not created correctly`);
      }
      const content = await fs.readFile(fullPath, 'utf8');
      if (content !== expectedContent) {
        throw new Error(`Wrong content for ${filePath}. Expected: ${expectedContent}, Found: ${content}`);
      }
    }

    console.log("Files created successfully, performing backup...");
    
    // Create initial backup and verify it's complete
    let backupResult = null;
    let retries = 3;
    
    while (retries > 0) {
      const tempBackup = await mogu.backup(testDir);
      console.log("Backup created with hash:", tempBackup.hash);
      
      // Wait a moment to ensure backup is complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify backup by restoring to a temporary directory
      const tempRestoreDir = path.join(TEST_DIR, 'temp-restore');
      await fs.emptyDir(tempRestoreDir);
      
      try {
        // Create subdirectories in restore path
        for (const dir of directories) {
          const restoreDirPath = path.join(tempRestoreDir, dir);
          console.log(`Creating restore directory: ${restoreDirPath}`);
          await fs.ensureDir(restoreDirPath);
        }

        await mogu.restore(tempBackup.hash, tempRestoreDir);
        console.log("Backup restored, verifying files...");

        // Verify restored directory structure
        const restoredFiles = await fs.readdir(tempRestoreDir, { recursive: true, withFileTypes: true });
        console.log("\nRestored directory structure:");
        restoredFiles.forEach(file => {
          console.log(`- ${file.isDirectory() ? '[DIR]' : '[FILE]'} ${file.name}`);
        });
        
        // Verify that all files were restored correctly
        let allFilesRestored = true;
        for (const [filePath, expectedContent] of Object.entries(initialFiles)) {
          const restoredPath = path.join(tempRestoreDir, filePath);
          console.log(`\nVerifying file: ${filePath}`);
          console.log(`Full path: ${restoredPath}`);
          
          if (!await fs.pathExists(restoredPath)) {
            console.log(`Missing file: ${filePath}`);
            const dirPath = path.dirname(restoredPath);
            const dirExists = await fs.pathExists(dirPath);
            console.log(`Directory ${dirPath} exists: ${dirExists}`);
            if (dirExists) {
              const dirContents = await fs.readdir(dirPath);
              console.log(`Contents of directory ${dirPath}:`, dirContents);
            }
            allFilesRestored = false;
            break;
          }
          
          const restoredContent = await fs.readFile(restoredPath, 'utf8');
          if (restoredContent !== expectedContent) {
            console.log(`Wrong content for ${filePath}`);
            console.log(`Expected: ${expectedContent}`);
            console.log(`Found: ${restoredContent}`);
            allFilesRestored = false;
            break;
          }
          
          console.log(`File ${filePath} verified successfully`);
        }
        
        if (allFilesRestored) {
          console.log("\nBackup verified successfully");
          await fs.remove(tempRestoreDir);
          backupResult = tempBackup;
          break;
        } else {
          console.log("\nBackup verification failed: some files were not restored correctly");
          // Recursive list of all files in restore directory
          const allFiles = await fs.readdir(tempRestoreDir, { recursive: true, withFileTypes: true });
          console.log("\nFiles present in restore directory:");
          allFiles.forEach(file => {
            const filePath = file.path ? path.join(file.path, file.name) : file.name;
            console.log(`- ${file.isDirectory() ? '[DIR]' : '[FILE]'} ${filePath}`);
          });
        }
      } catch (error) {
        console.log(`Backup verification attempt failed (${retries} attempts remaining):`, error);
      }
      
      retries--;
      if (retries > 0) {
        console.log(`\nRetrying backup (${retries} attempts remaining)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error('Unable to create a valid backup after 3 attempts');
      }
    }

    if (!backupResult) {
      throw new Error('Backup was not created correctly');
    }
    
    // Test 2: Compare with modifications
    console.log("\nTest 2: Compare with modifications");
    
    // Wait a moment before modifying files
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Modify some files
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'Modified content');
    await fs.writeFile(path.join(testDir, 'newfile.txt'), 'New content');
    await fs.remove(path.join(testDir, 'file2.json'));
    await fs.remove(path.join(testDir, 'subdir/file3.txt'));

    // Verify that modifications were applied
    const modifiedContent = await fs.readFile(path.join(testDir, 'file1.txt'), 'utf8');
    if (modifiedContent !== 'Modified content') {
      throw new Error('File modification failed');
    }

    // Test detailed comparison
    const detailedComparison = await mogu.compareDetailed(backupResult.hash, testDir);
    console.log("Detailed comparison result:", JSON.stringify(detailedComparison, null, 2));
    
    // Verify modifications
    if (detailedComparison.isEqual) {
      throw new Error('Directories should not be identical after modifications');
    }

    if (detailedComparison.totalChanges.modified !== 1) {
      throw new Error(`Expected 1 modified file, found ${detailedComparison.totalChanges.modified}`);
    }

    if (detailedComparison.totalChanges.added !== 1) {
      throw new Error(`Expected 1 added file, found ${detailedComparison.totalChanges.added}`);
    }

    if (detailedComparison.totalChanges.deleted !== 2) {
      throw new Error(`Expected 2 deleted files, found ${detailedComparison.totalChanges.deleted}`);
    }

    // Verify specific changes
    const changes = new Map(detailedComparison.differences.map(diff => [diff.path, diff]));
    
    // Verify file1.txt modification
    const file1Change = changes.get('file1.txt');
    if (!file1Change || file1Change.type !== 'modified') {
      throw new Error('Expected file1.txt to be modified');
    }

    // Verify newfile.txt addition
    const newfileChange = changes.get('newfile.txt');
    if (!newfileChange || newfileChange.type !== 'added') {
      throw new Error('Expected newfile.txt to be added');
    }

    // Verify file2.json deletion
    const file2Change = changes.get('file2.json');
    if (!file2Change || file2Change.type !== 'deleted') {
      throw new Error('Expected file2.json to be deleted');
    }

    // Verify subdir/file3.txt deletion
    const file3Change = changes.get('subdir/file3.txt');
    if (!file3Change || file3Change.type !== 'deleted') {
      throw new Error('Expected subdir/file3.txt to be deleted');
    }

    // Test 3: Compare with empty directory
    console.log("\nTest 3: Compare with empty directory");
    await fs.emptyDir(testDir);
    
    const emptyComparison = await mogu.compareDetailed(backupResult.hash, testDir);
    console.log("Empty directory comparison result:", JSON.stringify(emptyComparison, null, 2));
    
    const expectedDeletedFiles = Object.keys(initialFiles).length;
    if (emptyComparison.totalChanges.deleted !== expectedDeletedFiles) {
      throw new Error(
        `Wrong number of deleted files.\n` +
        `Expected: ${expectedDeletedFiles}\n` +
        `Found: ${emptyComparison.totalChanges.deleted}\n` +
        `Details: ${JSON.stringify(emptyComparison, null, 2)}`
      );
    }

    console.log("Compare functionality tests completed successfully!");
  } catch (error) {
    console.error("Error in compare tests:", error);
    throw error;
  }
}

async function testVersioning() {
  const mogu = new Mogu(baseConfig);

  // Create separate directories for each version
  const version1Dir = path.join(TEST_DIR, 'version1');
  const version2Dir = path.join(TEST_DIR, 'version2');
  const version3Dir = path.join(TEST_DIR, 'version3');

  await fs.ensureDir(version1Dir);
  await fs.ensureDir(version2Dir);
  await fs.ensureDir(version3Dir);

  console.log("\nCreating initial version...");
  // Version 1: Initial files
  const initialFiles = {
    'file1.txt': 'Initial content 1',
    'file2.txt': 'Initial content 2',
    'config.json': JSON.stringify({ version: 1 })
  };

  for (const [name, content] of Object.entries(initialFiles)) {
    await fs.writeFile(path.join(version1Dir, name), content);
  }

  const version1 = await mogu.backup(version1Dir);
  console.log("Version 1 created:", version1.hash);

  // Wait to ensure different timestamps
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("\nCreating version 2 (modified files)...");
  // Version 2: Modified files
  const version2Files = {
    'file1.txt': 'Modified content 1',
    'file2.txt': 'Initial content 2',
    'config.json': JSON.stringify({ version: 2 })
  };

  for (const [name, content] of Object.entries(version2Files)) {
    await fs.writeFile(path.join(version2Dir, name), content);
  }
  
  const version2 = await mogu.backup(version2Dir);
  console.log("Version 2 created:", version2.hash);

  // Wait to ensure different timestamps
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("\nCreating version 3 (added and deleted files)...");
  // Version 3: Different file structure
  const version3Files = {
    'file1.txt': 'Modified content 1',
    'file3.txt': 'New file content',
    'config.json': JSON.stringify({ version: 3 })
  };

  for (const [name, content] of Object.entries(version3Files)) {
    await fs.writeFile(path.join(version3Dir, name), content);
  }

  const version3 = await mogu.backup(version3Dir);
  console.log("Version 3 created:", version3.hash);

  // Test version comparison by restoring and comparing locally
  console.log("\nComparing versions by restoring...");

  // Create temporary directories for each version
  const v1RestoreDir = path.join(RESTORE_DIR, 'v1');
  const v2RestoreDir = path.join(RESTORE_DIR, 'v2');
  const v3RestoreDir = path.join(RESTORE_DIR, 'v3');

  await fs.ensureDir(v1RestoreDir);
  await fs.ensureDir(v2RestoreDir);
  await fs.ensureDir(v3RestoreDir);

  // Restore each version
  console.log("\nRestoring versions for comparison...");
  await mogu.restore(version1.hash, v1RestoreDir);
  await mogu.restore(version2.hash, v2RestoreDir);
  await mogu.restore(version3.hash, v3RestoreDir);

  // Verify version 1 content
  console.log("\nVerifying version 1 content...");
  for (const [name, expectedContent] of Object.entries(initialFiles)) {
    const content = await fs.readFile(path.join(v1RestoreDir, name), 'utf8');
    if (content !== expectedContent) {
      throw new Error(`Content mismatch in version 1 for ${name}`);
    }
  }

  // Verify version 2 changes
  console.log("\nVerifying version 2 changes...");
  for (const [name, expectedContent] of Object.entries(version2Files)) {
    const content = await fs.readFile(path.join(v2RestoreDir, name), 'utf8');
    if (content !== expectedContent) {
      throw new Error(`Content mismatch in version 2 for ${name}`);
    }
  }

  // Verify version 3 changes
  console.log("\nVerifying version 3 changes...");
  for (const [name, expectedContent] of Object.entries(version3Files)) {
    const content = await fs.readFile(path.join(v3RestoreDir, name), 'utf8');
    if (content !== expectedContent) {
      throw new Error(`Content mismatch in version 3 for ${name}`);
    }
  }

  // Verify file2.txt doesn't exist in version 3
  const file2Exists = await fs.pathExists(path.join(v3RestoreDir, 'file2.txt'));
  if (file2Exists) {
    throw new Error('file2.txt should not exist in version 3');
  }

  // Cleanup
  await fs.remove(version1Dir);
  await fs.remove(version2Dir);
  await fs.remove(version3Dir);
  await fs.remove(v1RestoreDir);
  await fs.remove(v2RestoreDir);
  await fs.remove(v3RestoreDir);

  console.log("Versioning tests completed successfully!");
}

async function testDelete() {
  const mogu = new Mogu(baseConfig);

  // Create test directory and file
  const testDir = path.join(TEST_DIR, 'delete-test');
  await fs.ensureDir(testDir);
  await fs.writeFile(path.join(testDir, 'test.txt'), 'Test content');

  // Create backup
  console.log("Creating backup for delete test...");
  const backup = await mogu.backup(testDir);
  console.log("Backup created:", backup.hash);

  // Verify backup exists by trying to restore it
  const restoreDir = path.join(RESTORE_DIR, 'delete-test');
  await fs.ensureDir(restoreDir);
  await mogu.restore(backup.hash, restoreDir);
  
  const restoredContent = await fs.readFile(path.join(restoreDir, 'test.txt'), 'utf8');
  if (restoredContent !== 'Test content') {
    throw new Error('Backup was not created correctly');
  }

  // Delete the backup
  console.log("Deleting backup...");
  const deleted = await mogu.delete(backup.hash);
  if (!deleted) {
    throw new Error('Delete operation failed');
  }
  console.log("Delete operation completed");

  // Test deleting non-existent backup
  console.log("Testing delete of non-existent backup...");
  const nonExistentResult = await mogu.delete('non-existent-hash');
  if (nonExistentResult !== false) {
    throw new Error('Delete of non-existent backup should return false');
  }

  console.log("Delete functionality tests completed successfully!");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});