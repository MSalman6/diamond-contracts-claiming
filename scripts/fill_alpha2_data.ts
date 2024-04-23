// get the memonic used from env variable.

import { task } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
// import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

import { ensure0x } from "../api/src/cryptoHelpers";
import { DMDClaimingHelpers } from "../api/src/DMDClaimingHelpers";

import { ClaimContract } from "../typechain-types/ClaimContract";

// import { ethers } from "hardhat";
//const { ethers } = require("hardhat");
//require("@nomiclabs/hardhat-ethers");

// figure out exact numbers.
// 
// current Pot: 3,768,982
// we take 1 DMD from the delta pot for feeding the claiming pot.
//  3,768,981 DMD go into the delta pot.

// the rest is distributed in 3 DMD chunks,
// the last chunk that cannot hold 10.000 dmd will hold the rest.



async function main() {

    //let ethers = hre.ethers;

    //console.log("ethers", ethers);


    let claimBeneficorAddress = "0x2000000000000000000000000000000000000001";
    let beneficorDAOAddress = "0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0";

    //let dillute1 =
    let now = (Date.now() / 1000).toFixed(0);
    let speedUpMultiplier = 1 / 60;

    const month = 60 * 60 * 24 * 31;
    const dillute1 = now + 3 * month * speedUpMultiplier;
    const dillute2 = now + 6 * month * speedUpMultiplier;
    const dillute3 = now + 5 * 12 * month * speedUpMultiplier;

    const contractFactory = await ethers.getContractFactory("ClaimContract");
    const claimContract  = await contractFactory.deploy(claimBeneficorAddress, beneficorDAOAddress, "0x", dillute1, dillute2, dillute3);


    let currentPot = 3768982;

    console.log('pot:', currentPot);

    const signers = await ethers.getSigners();

    let currentBalance = signers[0].getBalance();

    let currentPotBN = ethers.utils.parseEther(currentPot.toString());

    console.log('Pot: ', currentPotBN.toString());


    // // expections on coin claiming:
    // // claimed in phase 1: 75%
    // // claimed in phase 2: 5%
    // // claimed in phase 3: 5% 
    // // never claimed:      15%

    const cryptoJS = new DMDClaimingHelpers();

    const claim1Address1 = "0x69d1521d584e4F011A3ee4F620759aDAB758333b";
    const claim1AddressOld = "dDZuUpUDjbSxyufLJS1FkWxToq9k41dcAJ";
    const claim1AddressOldRipe = ensure0x(cryptoJS.dmdAddressToRipeResult(claim1AddressOld));
    const claim1Value = currentPot * 0.75;


    const claim2Address = "0x60348502c0C90d3ed90FD6E9037E2c3A1FfdB540";
    const claim2AddressOld = "dY5KBiex6p7wb1cchTYqhLWNrzSWBr49op";
    const claim2AddressOldRipe = ensure0x(cryptoJS.dmdAddressToRipeResult(claim2AddressOld));
    const claim2Value = currentPot * 0.05;

    const claim3Address = "0x94Df1f4D5BfbBd019F0C44d7f30351b12E568810";
    const claim3AddressOld = "dbdjYKKqYrKWuTSfQQAKdnXYUj5WLS4z6p";
    const claim3AddressOldRipe = ensure0x(cryptoJS.dmdAddressToRipeResult(claim3AddressOld));
    const claim3Value = currentPot * 0.05;


    // signers[0].sendTransaction( {to: claim1AddressOld, value: claim1Value});
    // signers[0].sendTransaction( {to: claim1AddressOld, value: claim1Value});
    // signers[0].sendTransaction( {to: claim1AddressOld, value: claim1Value});

    //let bn : ethers.BigNumber = ethers.BigNumber.from(claim1Value).mul();

    const logResult = (name: string, result: any) => {
        console.log(`add ${name} :  ${result.hash}, block: ${result.blockNumber} nonce: ${result.nonce},  `);
    };

    logResult('add1:', await (await claimContract.addBalance(claim1AddressOldRipe, { value: ethers.utils.parseEther(claim1Value.toString()) })).wait(1));
    logResult('add2:', await (await claimContract.addBalance(claim2AddressOldRipe, { value: ethers.utils.parseEther(claim2Value.toString()) })).wait(1));
    logResult('add3:', await (await claimContract.addBalance(claim3AddressOldRipe, { value: ethers.utils.parseEther(claim3Value.toString()) })).wait(1));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
