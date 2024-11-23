declare module 'gun-eth' {
  interface GunEthInstance {
    chainMethods: Record<string, Function>;
    generateRandomId: () => string;
    generatePassword: (signature: string) => string;
    gunToEthAccount: (privateKey: string) => any;
    getSigner: () => Promise<any>;
    deriveStealthAddress: (sharedSecret: string, spendingPublicKey: string) => any;
  }

  const gunEth: GunEthInstance;
  export = gunEth;
} 