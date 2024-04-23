import hre from "hardhat";
import { DMDClaimingAPI } from "../api/src/DMDClaimingAPI";
import { ClaimContract, ClaimContract__factory } from "../typechain-types";
import { stringToUTF8Hex } from "../api/src/cryptoHelpers";

let ethers = hre.ethers;



const prefix = "I want to claim my DMD Diamond V4 coins for the Testnet to the following address: ";


async function main() {

    let claimBeneficorAddress = "0x2000000000000000000000000000000000000001";
    let beneficorDAOAddress = "0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0";

    //let dillute1 =
    let now = (Date.now() / 1000).toFixed(0);

    const month = 60 * 60 * 24 * 31;
    const dillute1 = now + 3 * month;
    const dillute2 = now + 6 * month;
    const dillute3 = now + 5 * 12 * month;

    const contractFactory = await ethers.getContractFactory("ClaimContract");
    
    const prefixHex = stringToUTF8Hex(prefix);
    console.log("prefixHex", prefixHex);
    const claimContractAny : any = await contractFactory.deploy(claimBeneficorAddress, beneficorDAOAddress, prefixHex, dillute1, dillute2, dillute3);
    const claimContract = claimContractAny as ClaimContract;
    //const claimContract = claimContractAny as ClaimContract;
    
    await claimContract.waitForDeployment();
    let claimContractAddress = await claimContract.getAddress();
    console.log('claim contract deployed to:', claimContractAddress);
    console.log(`trying to verify.`);
    console.log(`npx command to verify localy - if the automated command fails:`); 
    console.log(`npx hardhat verify --network alpha2 ${claimContractAddress} ${claimBeneficorAddress} ${beneficorDAOAddress} ${prefixHex} ${dillute1} ${dillute2} ${dillute3}` );


    let cryptoSol = new DMDClaimingAPI(claimContract);

    let balanceRow = { dmdv3Address: 'dKnjYUHFJPunnpA5vw1U8rd7WrLgh9wcdY', dmdv4Address: '0xEb44B81852A2705701A59D454d1a33DA7a71E169', value: "1000000000000000000", signature: 'IAAbfHCOsm8WB+ARRAvNuaIdTKIOa029UpdZKhaH/fmyd8dhBe2uOOaANWSVhiQ9MwhonPqp30U5WzXcXkfZJlk=' };

    //let dmdV3Address = "dJXtBtpK2HCNrkiQHoghtEY9k13rwoFVGB";
    await (await cryptoSol.addBalance(balanceRow.dmdv3Address, balanceRow.value));
    // await cryptoSol.claim(balanceRow.dmdv3Address, balanceRow.dmdv4Address, balanceRow.signature, "", true);

    let currentBalance = ethers.provider.getBalance(balanceRow.dmdv4Address);
    console.log(`current balance: ${currentBalance}`);
  //  let signature = "IG8j0HGlWUh4SUpd4hgjFaumIPKybGxAevm35RnMwEkYZ+HWYD0IKODVkldrzfqJWdh+26y4fR5Ihmyzht+FdSM=";
  //  let dmdV4Address = "0xdd37EA7bA22500A43D28378b62A0fCA89bCCFd6F";

    //await cryptoSol.claim(dmdV3Address, dmdV4Address, signature);
    
    await hre.run("verify:verify", {
        address: claimContractAddress,
        constructorArguments: [
            claimBeneficorAddress,
            beneficorDAOAddress,
            prefix,
            dillute1,
            dillute2,
            dillute3,
        ],
      });
}

main();


