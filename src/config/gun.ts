import Gun from "gun";
import "gun/sea";
import path from "path";
import os from "os";

interface GunOptions {
  file?: string;
  peers?: string[];
  web?: any;
  // ... altre opzioni ...
}

let gunInstance: any;

// Inizializza Gun con un server HTTP
export const initGun = (server: any, inputOptions: GunOptions = {}) => {
  const defaultOptions: GunOptions = {
    file: path.join(process.cwd(), "radata"),
    peers: [],
    web: server
  };

  const options = { ...defaultOptions, ...inputOptions };

  if (!gunInstance) {
    gunInstance = Gun({
      file: options.file,
      peers: options.peers,
      web: options.web,
      radix: true,
      radisk: true,
    });

    gunInstance.on("error", (err: any) => {
      console.error("Gun error:", err);
    });
  }

  return gunInstance;
};

// Inizializza Gun senza server (per client)
export const initializeGun = (inputOptions: GunOptions = {}) => {
  const defaultOptions: GunOptions = {
    file: path.join(process.cwd(), "gun-data"),
    peers: []
  };

  const options = { ...defaultOptions, ...inputOptions };

  if (!gunInstance) {
    gunInstance = Gun({
      file: options.file,
      peers: options.peers,
      radix: true,
      radisk: true,
    });

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
