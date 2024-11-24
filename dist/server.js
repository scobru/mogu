"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const gun_1 = require("./config/gun");
const gunDb_1 = require("./db/gunDb");
const port = process.env.PORT || 8765;
const startServer = async () => {
    const app = (0, express_1.default)();
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
    // Inizializza Gun con il server
    const gunInstance = (0, gun_1.initGun)(server, {
        file: 'radata', // Usa lo stesso path dell'SDK
    });
    const gunDb = new gunDb_1.GunMogu(gunInstance);
    // Middleware minimo per Gun
    app.use('/gun', (req, res) => {
        gunInstance.web(req, res);
    });
    // Attendi che il server sia pronto
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { gunDb, server };
};
exports.startServer = startServer;
// Avvia il server se eseguito direttamente
if (require.main === module) {
    (0, exports.startServer)().catch(console.error);
}
