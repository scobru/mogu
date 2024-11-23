"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GunPluginManager = void 0;
const gun_1 = __importDefault(require("gun"));
class GunPluginManager {
    static register(plugin) {
        // Registra il plugin
        this.plugins.set(plugin.name, plugin);
        // Aggiungi i metodi alla chain di Gun
        if (plugin.chainMethods) {
            Object.entries(plugin.chainMethods).forEach(([name, method]) => {
                gun_1.default.chain[name] = method;
            });
        }
        // Aggiungi i metodi statici a Gun
        if (plugin.staticMethods) {
            Object.entries(plugin.staticMethods).forEach(([name, method]) => {
                gun_1.default[name] = method;
            });
        }
    }
    static initializePlugins(gunInstance) {
        // Inizializza tutti i plugin registrati
        this.plugins.forEach(plugin => {
            if (plugin.init) {
                plugin.init(gunInstance);
            }
        });
    }
    static getPlugin(name) {
        return this.plugins.get(name);
    }
}
exports.GunPluginManager = GunPluginManager;
GunPluginManager.plugins = new Map();
