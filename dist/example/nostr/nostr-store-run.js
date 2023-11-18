"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nostr_store_sdk_1 = __importDefault(require("./nostr-store-sdk"));
const sdk = new nostr_store_sdk_1.default(process.env.PRIVATE_KEY, process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET, process.env.DB_NAME, './nostr-cid-run.json.json');
async function runSDK() {
    const nostrKeys = sdk.generateNostrKeys();
    const cid = await sdk.encryptAndSaveData(nostrKeys);
    console.log('CID:', cid);
    const retrievedData = await sdk.retrieveAndDecryptData();
    console.log('Retrieved Data:', retrievedData);
}
runSDK();
