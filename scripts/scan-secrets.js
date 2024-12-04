const fs = require('fs');
const path = require('path');

// Patterns to detect potential secrets
const PATTERNS = {
  privateKey: /private[_-]?key|secret[_-]?key/i,
  apiKey: /api[_-]?key/i,
  password: /password|pwd/i,
  token: /token|jwt/i,
  mnemonic: /mnemonic|seed[_-]?phrase/i,
  // Add specific patterns for blockchain private keys
  ethereumPrivateKey: /0x[a-fA-F0-9]{64}/,
  base64: /[A-Za-z0-9+/]{64}/,
  // Add patterns for common environment variable names
  envVars: /PRIVATE_KEY|SECRET_KEY|API_KEY|PASSWORD|TOKEN|MNEMONIC/i
};

function scanForSecrets(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let foundSecrets = false;

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      return;
    }

    // Check each pattern
    for (const [type, pattern] of Object.entries(PATTERNS)) {
      if (pattern.test(line)) {
        // Ignore if it's just a variable declaration without value
        if (line.includes('=') || line.includes(':')) {
          console.error(`\x1b[31mPotential ${type} found in ${filePath}:${index + 1}\x1b[0m`);
          console.error(`Line: ${line.trim()}`);
          foundSecrets = true;
        }
      }
    }
  });

  return foundSecrets;
}

function scanDirectory(directory) {
  let foundSecrets = false;
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    // Skip node_modules and .git directories
    if (file === 'node_modules' || file === '.git') {
      return;
    }

    if (stats.isDirectory()) {
      // Recursively scan subdirectories
      if (scanDirectory(filePath)) {
        foundSecrets = true;
      }
    } else if (stats.isFile()) {
      // Only scan specific file types
      const ext = path.extname(file).toLowerCase();
      if (['.js', '.jsx', '.ts', '.tsx', '.json', '.env'].includes(ext)) {
        if (scanForSecrets(filePath)) {
          foundSecrets = true;
        }
      }
    }
  });

  return foundSecrets;
}

// Main execution
try {
  console.log('Scanning for potential secrets...');
  const hasSecrets = scanDirectory(process.cwd());
  
  if (hasSecrets) {
    console.error('\x1b[31m✖ Potential secrets found in codebase. Please remove them before committing.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ No potential secrets found\x1b[0m');
    process.exit(0);
  }
} catch (error) {
  console.error('Error during scan:', error);
  process.exit(1);
} 