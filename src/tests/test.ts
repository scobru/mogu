import { Mogu } from "../sdk/sdk";
import { NodeType, EncryptedNode } from "../db/types";

// Importa il server per assicurarsi che sia avviato
import '../server';

async function run() {
  try {
    console.log("Starting tests...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Server should be ready");

    // Test con Pinata
    console.log("Testing with Pinata...");
    const mogu = new Mogu(
      ['http://localhost:8765'],
      'test',  // No encryption
      'PINATA',
      {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
      },
      'test-db'
    );

    await runTests(mogu, "Pinata");

    console.log("All tests completed successfully!");

  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

async function runTests(mogu: Mogu, provider: string) {
  try {
    console.log(`Starting tests with ${provider}...`);
    
    // Login
    try {
        console.log("Attempting login...");
        await mogu.login('testuser', 'testpass');
        console.log('Login successful');
    } catch (err) {
        console.error('Login failed:', err);
        throw err;
    }

    // Test delle operazioni base
    console.log("Starting basic operations test...");
    try {
        await testBasicOperations(mogu);
    } catch (err) {
        console.error("Error in basic operations:", err);
        throw err;
    }
    
    // Test dei percorsi specifici
    console.log("Starting path operations test...");
    try {
        await testPathOperations(mogu);
    } catch (err) {
        console.error("Error in path operations:", err);
        throw err;
    }

    // Test dello user space
    console.log("Starting user space test...");
    try {
        await testUserSpace(mogu);
    } catch (err) {
        console.error("Error in user space operations:", err);
        throw err;
    }
    
    // Test delle query
    console.log("Starting query tests...");
    try {
        await testQueries(mogu);
    } catch (err) {
        console.error("Error in queries:", err);
        throw err;
    }
    
    // Test del backup IPFS
    console.log("Starting IPFS backup test...");
    try {
        await testIPFSBackup(mogu);
    } catch (err) {
        console.error("Error in IPFS backup:", err);
        throw err;
    }
  } catch (err) {
    console.error(`Test failed with ${provider}:`, err);
    throw err;
  }
}

async function testBasicOperations(mogu: Mogu) {
  console.log("\nTesting basic operations...");

  // Test creazione nodo semplice
  console.log("\nCreating simple node...");
  const node1: EncryptedNode = {
    id: "test/node1",
    type: NodeType.NODE,
    name: "test-node-1",
    content: "Hello World"
  };
  
  await mogu.addNode(node1);
  console.log("Simple node created");

  const retrievedNode = await mogu.getNode("test/node1");
  console.log("\nRetrieved node:", retrievedNode);
  console.log("Content is encrypted:", retrievedNode?.encrypted);
  console.log("Content:", retrievedNode?.content);
}

async function testPathOperations(mogu: Mogu) {
  console.log("\nTesting path operations...");

  // Test creazione struttura annidata
  console.log("\nCreating nested structure...");
  
  // Crea una struttura organizzativa
  const orgNode: EncryptedNode = {
    id: "organizations/org1",
    type: NodeType.NODE,
    name: "Test Organization",
    content: {
      name: "Test Org",
      founded: 2023
    }
  };
  
  const deptNode: EncryptedNode = {
    id: "organizations/org1/departments/dev",
    type: NodeType.NODE,
    name: "Development Department",
    content: {
      name: "Development",
      employees: 10
    }
  };

  const teamNode: EncryptedNode = {
    id: "organizations/org1/departments/dev/teams/frontend",
    type: NodeType.NODE,
    name: "Frontend Team",
    content: {
      name: "Frontend",
      lead: "John Doe"
    }
  };

  await mogu.addNode(orgNode);
  await mogu.addNode(deptNode);
  await mogu.addNode(teamNode);

  // Verifica la struttura
  const org = await mogu.getNode("organizations/org1");
  const dept = await mogu.getNode("organizations/org1/departments/dev");
  const team = await mogu.getNode("organizations/org1/departments/dev/teams/frontend");

  console.log("\nRetrieved organization structure:");
  console.log("Organization:", org);
  console.log("Department:", dept);
  console.log("Team:", team);
}

async function testUserSpace(mogu: Mogu) {
  console.log("\nTesting user space operations...");

  // Test creazione nodi nello user space
  const privateNote: EncryptedNode = {
    id: "~/notes/private1",
    type: NodeType.NODE,
    name: "Private Note",
    content: "This is a private note"
  };

  const userSettings: EncryptedNode = {
    id: "~/settings/theme",
    type: NodeType.NODE,
    name: "User Theme Settings",
    content: {
      theme: "dark",
      fontSize: 14
    }
  };

  await mogu.addNode(privateNote);
  await mogu.addNode(userSettings);

  // Verifica i nodi nello user space
  const note = await mogu.getNode("~/notes/private1");
  const settings = await mogu.getNode("~/settings/theme");

  console.log("\nRetrieved user space nodes:");
  console.log("Private Note:", note);
  console.log("User Settings:", settings);
}

async function testQueries(mogu: Mogu) {
  console.log("Testing queries...");

  // Query by name
  const nodesByName = mogu.queryByName("Frontend Team");
  console.log("Nodes by name:", nodesByName);

  // Query by type
  const nodesByType = mogu.queryByType(NodeType.NODE);
  console.log("Nodes by type:", nodesByType);

  // Query by content
  const nodesByContent = mogu.queryByContent("Frontend");
  console.log("Nodes by content:", nodesByContent);

  // Get all nodes
  const allNodes = mogu.getAllNodes();
  console.log("All nodes:", allNodes);
}

async function testIPFSBackup(mogu: Mogu) {
  console.log("\nTesting IPFS backup...");

  // Store current state
  const hash = await mogu.store();
  console.log("State stored with hash:", hash);

  if (hash) {
    // Mostra il contenuto dello stato prima del backup
    console.log("\nCurrent state before backup:");
    const currentState = mogu.getAllNodes();
    console.log(JSON.stringify(currentState, null, 2));

    // Test pin/unpin
    await mogu.pin();
    console.log("\nState pinned to IPFS");

    // Load from IPFS
    await mogu.load(hash);
    console.log("\nState loaded from IPFS");
    
    // Mostra il contenuto dello stato dopo il caricamento
    console.log("Loaded state from IPFS:");
    const loadedState = mogu.getAllNodes();
    console.log(JSON.stringify(loadedState, null, 2));

    // Verifica che gli stati siano identici confrontando il contenuto effettivo
    const statesMatch = currentState.length === loadedState.length && 
      currentState.every(currentNode => {
        const loadedNode = loadedState.find(n => n.id === currentNode.id);
        if (!loadedNode) return false;

        // Confronta solo i campi rilevanti
        const currentContent = JSON.stringify(currentNode.content);
        const loadedContent = JSON.stringify(loadedNode.content);

        return currentNode.id === loadedNode.id &&
               currentNode.type === loadedNode.type &&
               currentNode.name === loadedNode.name &&
               currentContent === loadedContent &&
               currentNode.encrypted === loadedNode.encrypted;
    });
    
    console.log("\nStates match:", statesMatch);
    if (!statesMatch) {
      console.log("\nDifferences found:");
      currentState.forEach(currentNode => {
        const loadedNode = loadedState.find(n => n.id === currentNode.id);
        if (!loadedNode) {
          console.log(`Node ${currentNode.id} not found in loaded state`);
          return;
        }
        if (JSON.stringify(currentNode) !== JSON.stringify(loadedNode)) {
          console.log(`\nDifferences in node ${currentNode.id}:`);
          console.log('Current:', currentNode);
          console.log('Loaded:', loadedNode);
        }
      });
    }

    // Unpin
    await mogu.unpin(hash);
    console.log("State unpinned from IPFS");
  }
}

// Main function to kick off the execution
function main() {
  console.log("Starting main...");
  const go = async () => {
    try {
      await run();
    } catch (err) {
      console.error("Fatal error in tests:", err);
      process.exit(1);
    }
  };
  
  go().catch(err => {
    console.error("Unhandled error in main:", err);
    process.exit(1);
  });
}

// Gestione degli errori non catturati
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

main();
