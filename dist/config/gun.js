"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gun = exports.getGunInstance = exports.initializeGun = void 0;
const gun_1 = __importDefault(require("gun"));
exports.Gun = gun_1.default;
require("gun/sea");
const path_1 = __importDefault(require("path"));
let gunInstance;
// Inizializza Gun senza server (per client)
const initializeGun = (inputOptions = {}) => {
    const defaultOptions = {
        file: path_1.default.join(process.cwd(), "radata"),
        peers: []
    };
    const options = { ...defaultOptions, ...inputOptions };
    if (!gunInstance) {
        gunInstance = (0, gun_1.default)({
            file: options.file,
            peers: options.peers,
            radix: true,
            radisk: true,
        });
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
