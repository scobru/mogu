"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = require("./routes");
const createApp = (gunDb) => {
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json());
    app.use((0, morgan_1.default)("combined"));
    // Routes
    const router = (0, routes_1.createRouter)(gunDb);
    app.use("/api", router);
    return app;
};
exports.createApp = createApp;
