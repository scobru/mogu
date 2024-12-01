"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encryption = void 0;
const crypto_1 = __importDefault(require("crypto"));
class Encryption {
    constructor(key, algorithm = 'aes-256-cbc') {
        this.algorithm = algorithm;
        this.key = crypto_1.default.createHash('sha256').update(key).digest();
    }
    encrypt(data) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(this.algorithm, this.key, iv);
        const input = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
        return { encrypted, iv };
    }
    decrypt(encrypted, iv) {
        const decipher = crypto_1.default.createDecipheriv(this.algorithm, this.key, iv);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
}
exports.Encryption = Encryption;
