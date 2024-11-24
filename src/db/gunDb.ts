import Gun from 'gun';
import 'gun/sea';
import { EncryptedNode, NodeType, EncryptedNode as StandardNode } from './types';
import { IPFSAdapter } from './adapters/ipfsAdapter';


// Definisci l'interfaccia per le opzioni di Gun
interface GunOptions {
  peers?: string[];
  localStorage?: boolean;
  radisk?: boolean;
  file?: string;
  multicast?: boolean;
  axe?: boolean;
  web?: any;
}

export interface GunNode {
  id: string;
  type: NodeType;
  name: string;
  content?: any;
  encrypted?: boolean;
}

export class GunMogu {
  private gun: any;
  private user: any;
  private nodes: any;
  private ipfsAdapter?: IPFSAdapter;
  private pair: any;
  private sea: any;
  private encryptionKey: string;
  private peers: Set<string> = new Set();

  constructor(
    gunInstance: any,
    encryptionKey: string = ''
  ) {
    this.encryptionKey = encryptionKey;
    this.gun = gunInstance;
    this.user = this.gun.user();
    this.nodes = this.gun.get('nodes');
    this.sea = Gun.SEA;
  }

  // Gestione dei peer
  addPeer(peerUrl: string) {
    if (!this.peers.has(peerUrl)) {
      this.gun.opt({ peers: [peerUrl] });
      this.peers.add(peerUrl);
    }
    return Array.from(this.peers);
  }

  removePeer(peerUrl: string) {
    if (this.peers.has(peerUrl)) {
      this.peers.delete(peerUrl);
      // Ricrea la connessione con i peer rimanenti
      this.gun.opt({ peers: Array.from(this.peers) });
    }
    return Array.from(this.peers);
  }

  getPeers(): string[] {
    return Array.from(this.peers);
  }

  // Autenticazione
  async authenticate(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Reset completo dell'utente
      if (this.user.is) {
        this.user.leave();
      }

      // Funzione per tentare l'autenticazione
      const tryAuth = () => {
        console.log("Attempting auth...");
        this.user.auth(username, password, (ack: any) => {
          if (ack.err) {
            console.log("Auth failed, creating user...");
            // Se l'autenticazione fallisce, prova a creare l'utente
            this.user.create(username, password, (createAck: any) => {
              if (createAck.err) {
                console.error("User creation failed:", createAck.err);
                reject(createAck.err);
              } else {
                console.log("User created, retrying auth...");
                // Riprova l'autenticazione dopo la creazione
                this.user.auth(username, password, (finalAck: any) => {
                  if (finalAck.err) {
                    console.error("Final auth failed:", finalAck.err);
                    reject(finalAck.err);
                  } else {
                    console.log("Auth successful!");
                    resolve(finalAck);
                  }
                });
              }
            });
          } else {
            console.log("Auth successful!");
            resolve(ack);
          }
        });
      };

      // Avvia il processo di autenticazione
      console.log("Starting authentication process...");
      tryAuth();
    });
  }

  private parseNodePath(id: string): string[] {
    // Rimuove eventuali slash iniziali e finali e splitta il path
    return id.replace(/^\/+|\/+$/g, '').split('/');
  }

  private async getGunReference(path: string[]): Promise<any> {
    let ref = this.nodes;
    
    // Se inizia con ~ usa lo user space
    if (path[0] === '~') {
      if (!this.user.is) {
        throw new Error('User not authenticated for user space access');
      }
      ref = this.user;
      path = path.slice(1); // Rimuove il ~
    }

    // Costruisce il riferimento attraverso il path
    for (const segment of path) {
      if (!ref) {
        throw new Error(`Invalid path: ${path.join('/')}`);
      }
      ref = ref.get(segment);
    }
    
    return ref;
  }

  // Sposta qui la logica di conversione dei nodi
  private convertToStandardNode(gunNode: GunNode): EncryptedNode {
    return {
      id: gunNode.id,
      type: gunNode.type,
      name: gunNode.name,
      content: gunNode.content,
      encrypted: gunNode.encrypted
    };
  }

  // Gestione dello stato interno
  private state: Map<string, EncryptedNode> = new Map();

  // Metodi per la gestione dello stato
  getState(): Map<string, EncryptedNode> {
    return this.state;
  }

  setState(newState: Map<string, EncryptedNode>) {
    this.state = newState;
  }

  // Metodi per la gestione dei nodi
  async addNode(node: EncryptedNode) {
    await this.addNodeToGun(node);
    this.state.set(node.id, node);
    return this.state;
  }

  private async addNodeToGun(node: EncryptedNode) {
    if (!this.user.is) {
      throw new Error('User not authenticated');
    }

    try {
      let secureNode: GunNode = {
        ...node,
        encrypted: false
      };
      
      // Prepara il contenuto (con eventuale crittografia)
      if (this.pair && node.content) {
        console.log("Encrypting content:", node.content);
        const contentJson = typeof node.content === 'string' ? 
          JSON.stringify({ value: node.content }) : 
          JSON.stringify(node.content);

        const encryptedContent = await this.sea.encrypt(contentJson, this.pair);
        console.log("Encrypted content:", encryptedContent);
        secureNode.content = encryptedContent;
        secureNode.encrypted = true;
      } else {
        console.log("Storing content in clear text");
        secureNode.content = node.content;
      }

      // Parse il path e ottiene il riferimento corretto
      const pathSegments = this.parseNodePath(node.id);
      console.log("Path segments:", pathSegments);

      return new Promise((resolve, reject) => {
        try {
          let currentRef = this.nodes;
          
          // Se è nello user space
          if (pathSegments[0] === '~') {
            currentRef = this.user;
            pathSegments.shift();
          }

          // Crea i nodi intermedi se necessario
          pathSegments.forEach((segment, index) => {
            if (index === pathSegments.length - 1) {
              // Ultimo segmento - salva il nodo
              currentRef.get(segment).put(secureNode, (ack: any) => {
                if (ack.err) {
                  reject(ack.err);
                  return;
                }
                console.log("Node saved at path:", pathSegments.join('/'));
                resolve(secureNode);
              });
            } else {
              // Nodi intermedi
              currentRef = currentRef.get(segment);
            }
          });
        } catch (err) {
          reject(err);
        }
      });

    } catch (err) {
      console.error('Error in addNode:', err);
      throw err;
    }
  }

  async getNode(id: string): Promise<EncryptedNode | null> {
    const gunNode = await this.getNodeFromGun(id);
    if (gunNode) {
      this.state.set(id, gunNode);
      return gunNode;
    }
    return this.state.get(id) || null;
  }

  private async getNodeFromGun(id: string): Promise<EncryptedNode | null> {
    console.log("GunMogu: Starting getNode...", id);
    
    if (!this.user.is) {
      throw new Error('User not authenticated');
    }

    try {
      // Parse il path e ottiene il riferimento
      const pathSegments = this.parseNodePath(id);
      console.log("Path segments:", pathSegments);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log("GunMogu: getNode timed out");
          resolve(null);
        }, 5000);

        let currentRef = this.nodes;
        
        // Se è nello user space
        if (pathSegments[0] === '~') {
          currentRef = this.user;
          pathSegments.shift();
        }

        // Naviga attraverso il path
        pathSegments.forEach((segment, index) => {
          currentRef = currentRef.get(segment);
        });

        // Leggi il nodo finale
        currentRef.once(async (node: GunNode) => {
          clearTimeout(timeout);
          console.log("GunMogu: Raw node received:", node);
          
          if (!node) {
            console.log("GunMogu: Node not found");
            resolve(null);
            return;
          }

          try {
            let decryptedContent = node.content;
            if (node.encrypted && this.pair && node.content) {
              console.log("GunMogu: Decrypting content...");
              try {
                const decrypted = await this.sea.decrypt(node.content, this.pair);
                if (decrypted) {
                  if (typeof decrypted === 'string') {
                    try {
                      const parsed = JSON.parse(decrypted);
                      decryptedContent = parsed.value || parsed;
                    } catch {
                      decryptedContent = decrypted;
                    }
                  } else {
                    decryptedContent = decrypted.value || decrypted;
                  }
                }
              } catch (decryptError) {
                console.error("GunMogu: Decryption error:", decryptError);
                decryptedContent = node.content;
              }
            } else {
              console.log("GunMogu: Content is in clear text");
              decryptedContent = node.content;
            }

            const standardNode: StandardNode = {
              id: node.id || id,  // Usa l'ID originale se non presente nel nodo
              type: node.type || NodeType.NODE,
              name: node.name,
              content: decryptedContent,
              encrypted: node.encrypted
            };

            console.log("GunMogu: Node processed successfully:", standardNode);
            resolve(standardNode);
          } catch (err) {
            console.error('GunMogu: Error processing node:', err);
            resolve(null);
          }
        });
      });
    } catch (err) {
      console.error('Error getting node:', err);
      return null;
    }
  }

  // Aggiornamento nodo
  async updateNode(node: StandardNode) {
    return this.addNode(node);
  }

  // Rimozione nodo
  async removeNode(id: string) {
    return new Promise((resolve) => {
      this.nodes.get(id).put(null, (ack: any) => {
        resolve(ack);
      });
    });
  }

  // Query methods
  async queryByName(name: string): Promise<EncryptedNode[]> {
    const nodes: EncryptedNode[] = [];
    return new Promise((resolve) => {
      this.nodes.map().once(async (node: GunNode) => {
        if (node && node.name === name) {
          const decryptedNode = await this.getNode(node.id);
          if (decryptedNode) {
            nodes.push(decryptedNode);
          }
        }
        resolve(nodes);
      });
    });
  }

  async queryByType(type: NodeType): Promise<EncryptedNode[]> {
    const nodes: EncryptedNode[] = [];
    return new Promise((resolve) => {
      this.nodes.map().once(async (node: GunNode) => {
        if (node && node.type === type) {
          const decryptedNode = await this.getNode(node.id);
          if (decryptedNode) {
            nodes.push(decryptedNode);
          }
        }
        resolve(nodes);
      });
    });
  }

  async queryByContent(content: string): Promise<EncryptedNode[]> {
    const nodes: EncryptedNode[] = [];
    return new Promise((resolve) => {
      this.nodes.map().once(async (node: GunNode) => {
        if (node && String(node.content) === content) {
          const decryptedNode = await this.getNode(node.id);
          if (decryptedNode) {
            nodes.push(decryptedNode);
          }
        }
        resolve(nodes);
      });
    });
  }

  // Sottoscrizione a cambiamenti
  subscribeToChanges(callback: (node: EncryptedNode) => void) {
    this.gun.map().on(async (gunNode: GunNode, id: string) => {
      if (gunNode) {
        const standardNode = this.convertToStandardNode(gunNode);
        this.state.set(id, standardNode);
        callback(standardNode);
      }
    });
  }

  // Aggiungi un getter per accedere all'istanza Gun
  public getGunInstance() {
    return this.gun;
  }

  // Metodo per accedere all'istanza Gun
  public getGun() {
    return this.gun;
  }
} 