"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillTestData = void 0;
const cryptoSol_1 = require("../src/cryptoSol");
const testFunctions_1 = require("../../test/testFunctions");
async function fillTestData() {
    //  function fill(bytes20[] memory _accounts, uint256[] memory _balances) public payable {
    // const accounts = [];
    // const balances = [];
    const cryptoSol = await cryptoSol_1.CryptoSol.fromContractAddress("0xE1B81826cf8DA91097B6Ab1d160eD6e139C29b52");
    const testFunctions = new testFunctions_1.TestFunctions(cryptoSol.instance);
    testFunctions.setLogDebug(true);
    console.log("adding test balances.");
    await testFunctions.testAddBalances();
}
exports.fillTestData = fillTestData;
