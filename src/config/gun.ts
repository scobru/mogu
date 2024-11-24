import Gun from "gun";
import "gun/sea";
import path from "path";
import os from "os";

interface GunOptions {
  peers?: string[];
  localStorage?: boolean;
  radisk?: boolean;
  file?: string;
  multicast?: boolean;
  axe?: boolean;
  web?: any;
}

let gunInstance: any;

// Inizializza Gun con un server HTTP
export const initGun = (server: any) => {
  if (!gunInstance) {
    const gunPath = path.join(os.tmpdir(), "gun-data");

    const options: GunOptions = {
      web: server,
      localStorage: false,
      radisk: true,
      file: gunPath,
      multicast: true,
      axe: true,
    };

    gunInstance = Gun(options);

    gunInstance.on("error", (err: any) => {
      console.error("Gun error:", err);
    });
  }

  return gunInstance;
};

// Inizializza Gun senza server (per client)
export const initializeGun = (peers: string[] = []) => {
  if (!gunInstance) {
    const gunPath = path.join(os.tmpdir(), "gun-data");

    const options: GunOptions = {
      peers,
      localStorage: false,
      radisk: false,
      file: gunPath,
      multicast: false,
      axe: false,
    };

    gunInstance = Gun(options);

    gunInstance.on("error", (err: any) => {
      console.error("Gun error:", err);
    });
  }

  return gunInstance;
};

export const getGunInstance = () => {
  if (!gunInstance) {
    throw new Error("Gun not initialized. Call initializeGun or initGun first.");
  }
  return gunInstance;
};
