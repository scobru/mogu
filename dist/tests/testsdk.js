"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("../sdk/sdk");
const mogu = new sdk_1.Mogu("", process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
async function test() {
    const state = await mogu.load("");
    console.log(state);
}
test();
