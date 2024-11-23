"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGun = void 0;
const gun_1 = __importDefault(require("gun"));
require("gun/sea");
require("gun/lib/then");
require("gun/lib/radix");
require("gun/lib/radisk");
require("gun/lib/store");
require("gun/lib/rindexed");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const initGun = (server) => {
    // Usa una directory temporanea del sistema per i file radata
    const radataPath = path_1.default.join(os_1.default.tmpdir(), 'mogu-radata');
    const options = {
        web: server,
        localStorage: false,
        radisk: true,
        file: radataPath,
        multicast: false,
        axe: false,
        peers: server ? undefined : ['http://localhost:8765/gun'],
        debug: false
    };
    const gun = (0, gun_1.default)(options);
    // Usa il metodo on solo per gli errori critici
    gun.on('error', (err) => {
        if (err && err.code !== 'EPERM') {
            console.error('Critical Gun error:', err);
        }
    });
    return gun;
};
exports.initGun = initGun;
