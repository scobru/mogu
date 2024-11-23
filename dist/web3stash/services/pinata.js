"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinataService = void 0;
const base_storage_1 = require("./base-storage");
const sdk_1 = __importDefault(require("@pinata/sdk"));
class PinataService extends base_storage_1.StorageService {
    constructor(pinataApiKey, pinataApiSecret) {
        super();
        this.serviceBaseUrl = 'ipfs://';
        this.serviceInstance = (0, sdk_1.default)(pinataApiKey, pinataApiSecret);
    }
    async unpin(hash) {
        await this.serviceInstance.unpin(hash);
    }
    async uploadJson(jsonData, options) {
        const response = await this.serviceInstance.pinJSONToIPFS(jsonData, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadImage(path, options) {
        const response = await this.serviceInstance.pinFromFS(path, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadVideo(path, options) {
        const response = await this.serviceInstance.pinFromFS(path, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadFile(path, options) {
        const response = await this.serviceInstance.pinFromFS(path, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadImageFromStream(readableStream, options) {
        const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadVideoFromStream(readableStream, options) {
        const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadFileFromStream(readableStream, options) {
        const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
}
exports.PinataService = PinataService;
