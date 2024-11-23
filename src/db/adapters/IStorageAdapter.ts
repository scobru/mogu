// Interfaccia base per gli adapter di storage
export interface IStorageAdapter {
  put(key: string, data: any): Promise<void>;
  get(key: string): Promise<any>;
  remove(key: string): Promise<void>;
} 