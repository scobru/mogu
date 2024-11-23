"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.gun = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const api_1 = require("./api/api");
const gun_1 = require("./config/gun");
const gunDb_1 = require("./db/gunDb");
const port = process.env.PORT || 8765;
// Inizializza il server HTTP
const startServer = () => {
    // Crea l'app Express
    const app = (0, express_1.default)();
    // Crea il server HTTP
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
    // Inizializza Gun con il server
    const gunInstance = (0, gun_1.initGun)(server);
    const gunDb = new gunDb_1.GunMogu(gunInstance);
    // Aggiungi il middleware per Gun
    app.use('/gun', (req, res) => {
        if (req.url === '/gun' && req.method === 'GET') {
            res.status(200).send('Gun server is running');
            return;
        }
        // Cast gunInstance a any per accedere a web
        gunInstance.web?.(req, res);
    });
    // Crea l'app con le route API
    const appWithRoutes = (0, api_1.createApp)(gunDb);
    app.use(appWithRoutes);
    return { app, server, gun: gunInstance };
};
// Esporta le istanze
_a = startServer(), exports.app = _a.app, exports.server = _a.server, exports.gun = _a.gun;
