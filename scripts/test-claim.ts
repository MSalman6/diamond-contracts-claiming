import { DMDClaimingAPI } from "../api/src/DMDClaimingAPI";
import { ClaimContract, ClaimContract__factory } from "../typechain-types";
import hre from "hardhat";

let ethers = hre.ethers;

async function main() {

    let claimContractAddress = "0xE047Bd57e8d3a2d0E790d336d8Ab5D7932570EA1";
    // get the claiming contract from ethereum address.
    const claimingContract = ClaimContract__factory.connect(claimContractAddress, ethers.provider);
    let cryptoSol = new DMDClaimingAPI(claimingContract as ClaimContract);
    let balanceRow = { dmdv3Address: 'dKnjYUHFJPunnpA5vw1U8rd7WrLgh9wcdY', dmdv4Address: '0xEb44B81852A2705701A59D454d1a33DA7a71E169', value: "1000000000000000000", signature: 'IAAbfHCOsm8WB+ARRAvNuaIdTKIOa029UpdZKhaH/fmyd8dhBe2uOOaANWSVhiQ9MwhonPqp30U5WzXcXkfZJlk=' };
    console.log("Claiming from: ", balanceRow.dmdv3Address, " to ", balanceRow.dmdv4Address);
    await cryptoSol.claim(balanceRow.dmdv3Address, balanceRow.dmdv4Address, balanceRow.signature, "", true);
    
}

main();


