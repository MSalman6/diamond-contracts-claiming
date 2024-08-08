"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cryptoSol_1 = require("../api/src/cryptoSol");
const typechain_types_1 = require("../typechain-types");
const hardhat_1 = __importDefault(require("hardhat"));
let ethers = hardhat_1.default.ethers;
async function main() {
    let claimContractAddress = "0xE047Bd57e8d3a2d0E790d336d8Ab5D7932570EA1";
    // get the claiming contract from ethereum address.
    const claimingContract = typechain_types_1.ClaimContract__factory.connect(claimContractAddress, ethers.provider);
    let cryptoSol = new cryptoSol_1.CryptoSol(claimingContract);
    let balanceRow = { dmdv3Address: 'dKnjYUHFJPunnpA5vw1U8rd7WrLgh9wcdY', dmdv4Address: '0xEb44B81852A2705701A59D454d1a33DA7a71E169', value: "1000000000000000000", signature: 'IAAbfHCOsm8WB+ARRAvNuaIdTKIOa029UpdZKhaH/fmyd8dhBe2uOOaANWSVhiQ9MwhonPqp30U5WzXcXkfZJlk=' };
    console.log("Claiming from: ", balanceRow.dmdv3Address, " to ", balanceRow.dmdv4Address);
    await cryptoSol.claim(balanceRow.dmdv3Address, balanceRow.dmdv4Address, balanceRow.signature, "", true);
}
main();
