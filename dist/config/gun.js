"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGunInstance = exports.initializeGun = exports.initGun = void 0;
const gun_1 = __importDefault(require("gun"));
require("gun/sea");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
let gunInstance;
// Inizializza Gun con un server HTTP
const initGun = (server) => {
    if (!gunInstance) {
        const gunPath = path_1.default.join(os_1.default.tmpdir(), "gun-data");
        const options = {
            web: server,
            localStorage: false,
            radisk: false,
            file: gunPath,
            multicast: false,
            axe: false,
        };
        gunInstance = (0, gun_1.default)(options);
        gunInstance.on("error", (err) => {
            console.error("Gun error:", err);
        });
    }
    return gunInstance;
};
exports.initGun = initGun;
// Inizializza Gun senza server (per client)
const initializeGun = (peers = []) => {
    if (!gunInstance) {
        const gunPath = path_1.default.join(os_1.default.tmpdir(), "gun-data");
        const options = {
            peers,
            localStorage: false,
            radisk: false,
            file: gunPath,
            multicast: false,
            axe: false,
        };
        gunInstance = (0, gun_1.default)(options);
        gunInstance.on("error", (err) => {
            console.error("Gun error:", err);
        });
    }
    return gunInstance;
};
exports.initializeGun = initializeGun;
const getGunInstance = () => {
    if (!gunInstance) {
        throw new Error("Gun not initialized. Call initializeGun or initGun first.");
    }
    return gunInstance;
};
exports.getGunInstance = getGunInstance;
