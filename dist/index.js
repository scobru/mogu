"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeType = exports.MoguOnChain = exports.Mogu = void 0;
const plugins_1 = require("./plugins");
// Registra i plugin prima di usare Gun
(0, plugins_1.registerGunPlugins)();
// Esporta tutto il resto
var sdk_1 = require("./sdk/sdk");
Object.defineProperty(exports, "Mogu", { enumerable: true, get: function () { return sdk_1.Mogu; } });
Object.defineProperty(exports, "MoguOnChain", { enumerable: true, get: function () { return sdk_1.MoguOnChain; } });
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return sdk_1.NodeType; } });
