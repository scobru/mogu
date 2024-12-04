declare module '@pinata/sdk' {
  export interface PinataPinOptions {
    pinataMetadata?: {
      name?: string;
      keyvalues?: Record<string, string | number | null>;
    };
    pinataOptions?: {
      cidVersion?: 0 | 1;
      wrapWithDirectory?: boolean;
      customPinPolicy?: {
        regions: Array<{
          id: string;
          desiredReplicationCount: number;
        }>;
      };
    };
  }

  export interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
    isDuplicate?: boolean;
  }

  export interface PinataClient {
    pinJSONToIPFS(body: any, options?: PinataPinOptions): Promise<PinataResponse>;
    pinFileToIPFS(readableStream: any, options?: PinataPinOptions): Promise<PinataResponse>;
    pinFromFS(sourcePath: string, options?: PinataPinOptions): Promise<PinataResponse>;
    unpin(hashToUnpin: string): Promise<void>;
    pinList(filters?: { hashContains?: string }): Promise<{
      rows: Array<{
        ipfs_pin_hash: string;
        size: number;
        date_pinned: string;
        metadata: Record<string, any>;
      }>;
    }>;
  }

  export default function createPinataClient(apiKey: string, apiSecret: string): PinataClient;
} 