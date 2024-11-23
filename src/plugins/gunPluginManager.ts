import Gun from 'gun';

// Estendi il tipo Gun globalmente
declare global {
  interface IGun {
    chain: any;
  }
}

export interface GunPlugin {
  name: string;
  chainMethods?: Record<string, Function>;
  staticMethods?: Record<string, Function>;
  init?: (gun: any) => void;
}

export class GunPluginManager {
  private static plugins: Map<string, GunPlugin> = new Map();

  static register(plugin: GunPlugin) {
    // Registra il plugin
    this.plugins.set(plugin.name, plugin);

    // Aggiungi i metodi alla chain di Gun
    if (plugin.chainMethods) {
      Object.entries(plugin.chainMethods).forEach(([name, method]) => {
        (Gun as any).chain[name] = method;
      });
    }

    // Aggiungi i metodi statici a Gun
    if (plugin.staticMethods) {
      Object.entries(plugin.staticMethods).forEach(([name, method]) => {
        (Gun as any)[name] = method;
      });
    }
  }

  static initializePlugins(gunInstance: any) {
    // Inizializza tutti i plugin registrati
    this.plugins.forEach(plugin => {
      if (plugin.init) {
        plugin.init(gunInstance);
      }
    });
  }

  static getPlugin(name: string): GunPlugin | undefined {
    return this.plugins.get(name);
  }
} 