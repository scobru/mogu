"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDir = createDir;
exports.writeFile = writeFile;
exports.deleteFile = deleteFile;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function createDir(path) {
    try {
        await promises_1.default.access(path);
        // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
    }
    catch (err) {
        await promises_1.default.mkdir(path, { recursive: true });
    }
}
async function writeFile(path, data) {
    await createDir(path_1.default.dirname(path));
    await promises_1.default.writeFile(path, data, 'utf8');
}
async function deleteFile(path) {
    await promises_1.default.rm(path, { recursive: true });
}
