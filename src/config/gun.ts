import Gun from "gun";
import "gun/sea";
import path from "path";

interface GunOptions {
  file?: string;
  peers?: string[];
  web?: any;
  radisk?: boolean
  // ... altre opzioni ...
}

let gunInstance: any;

// Inizializza Gun senza server (per client)
export const initializeGun = (inputOptions: GunOptions = {}) => {
  const defaultOptions: GunOptions = {
    file: path.join(process.cwd(), "radata"),
    peers: [],
    radisk: true
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

export { Gun };
