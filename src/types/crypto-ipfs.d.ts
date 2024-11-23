declare module '@scobru/crypto-ipfs' {
  export default class MecenateHelper {
    // Aggiungi qui i tipi necessari
    static encrypt(data: any, key: Uint8Array): Promise<string>;
    static decrypt(data: string, key: Uint8Array): Promise<any>;
  }
} 