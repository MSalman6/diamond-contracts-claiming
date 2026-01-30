// import { ethers } from "hardhat";
import { ClaimContract } from '../../typechain-types/index';
import { ensure0x, ensure0xb32, remove0x, stringToUTF8Hex, toHexString } from './cryptoHelpers';
import { CryptoJS } from './cryptoJS';
import { hexToBuf } from './cryptoHelpers';
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BalanceV3 } from "../data/interfaces";

let base58check = require('base58check'); 

/**
 * Crypto functions used in this project implemented in Soldity.
 */
export class CryptoSol {

  public cryptoJS = new CryptoJS();

  private logDebug: boolean = false;

  // public static async fromContractAddress(contractAddress: string): Promise<CryptoSol> {

  //   const contract: any = await ethers.getContractAt("ClaimContract", contractAddress);
  //   return new CryptoSol(contract);
  // }

  /// Creates an instance if you already have a ClaimContract instance.
  /// use static method fromContractAddress() for creating an instance from a contract address.
  public constructor(public instance: ClaimContract) {
    if (instance === undefined || instance === null) {
      throw Error("Claim contract must be defined!!");
    }
  }

  public async claim(dmdV3Address: string, dmdV4Address: string, signature: string, postfix: string) {
    
    let postfixHex = stringToUTF8Hex(postfix);

    const claimMessageHex = await this.instance.createClaimMessage(dmdV4Address, postfixHex);
    this.log('Claiming:');
    this.log('dmdV3Address:', dmdV3Address);
    this.log('dmdV4Address:', dmdV3Address);
    this.log('signature:', signature);
    this.log('postfix:', postfix);
    this.log('Claim Message hex: ' , claimMessageHex);

    // convert the hexstring to a string.
    const claimMessage = hexToBuf(claimMessageHex).toString('utf-8');
    this.log("claimMessage: ", claimMessage);

    let prefixString = await this.prefixString();
    const pubkey = this.cryptoJS.getPublicKeyFromSignature(signature,  prefixString + dmdV4Address + postfix, true);

    const rs = this.cryptoJS.signatureBase64ToRSV(signature);

    let pubKeyX = ensure0xb32(pubkey.x);
    let pubKeyY = ensure0xb32(pubkey.y);

    this.log("pub key x:", pubKeyX);
    this.log("pub key y:", pubKeyY);
    
    let dmdV3AddressFromSignaturesHex = await this.instance.publicKeyToDMDAddress(pubKeyX, pubKeyY);

    this.log('dmdV3AddressFromSignaturesHex:   ', dmdV3AddressFromSignaturesHex);
    this.log('dmdV3AddressFromSignaturesBase58:', base58check.encode(remove0x(dmdV3AddressFromSignaturesHex)));
    this.log('dmdV3AddressFromDataBase58:      ', dmdV3Address);

    let v = await this.recoverV(dmdV4Address, postfixHex, pubKeyX, pubKeyY, rs.r, rs.s);
    let gasPrice = await this.getGasPriceWithFloor();
    console.log("Using gas price (wei):", gasPrice.toString());
    let claimOperation = this.instance.claim(dmdV4Address, postfixHex, pubKeyX, pubKeyY, v, rs.r, rs.s, { gasLimit: 200_000, gasPrice: gasPrice });
    let receipt = await (await claimOperation).wait();
    // console.log("receipt: ", receipt?.toJSON())
    return receipt;
  }

  /**
   * Fetch current gasPrice from RPC - if the call fails or it's below 10 gwei, use a 10 gwei floor.
   */
  private async getGasPriceWithFloor(): Promise<bigint> {
    const tenGweiWei = 10n * 1_000_000_000n; // 10 gwei in wei

    const runner: any = (this.instance as any)?.runner ?? null;
    const provider: any = runner?.provider ?? null;

    // fall back to the floor
    if (!provider) {
      return tenGweiWei;
    }

    // Try direct gasPrice first
    try {
      const currentGasPrice: bigint = await provider.getGasPrice();
      if (typeof currentGasPrice === 'bigint') {
        return currentGasPrice < tenGweiWei ? tenGweiWei : currentGasPrice;
      }
    } catch (_) {}

    return tenGweiWei;
  }

  public async recoverV(dmdV4Address: string, postfixHex: string, pubKeyX: string, pubKeyY: string, r: Buffer, s: Buffer) : Promise<string> {

    this.log("recoverV:", pubKeyX, pubKeyY);

    // trim away leading X.

    if (await this.instance.claimMessageMatchesSignature(dmdV4Address, postfixHex, pubKeyX, pubKeyY, "0x1b", r, s)) { 
      return "0x1b";
    }

    if (await this.instance.claimMessageMatchesSignature(dmdV4Address, postfixHex, pubKeyX, pubKeyY, "0x1c", r, s)) { 
      return "0x1c";
    }

    throw Error("Could not match signature, v could not be retrieved.");
  }

  public setLogDebug(value: boolean) {
    this.logDebug = value;
    this.cryptoJS.setLogDebug(value);
  }

  private log(message: string, ...params: any[]) {
    if (this.logDebug) {
      console.log(message, ...params);
    }
  }

  public async messageToHash(messageString: string) {

    const buffer = Buffer.from(messageString, 'utf-8');

    const hash = await this.instance.calcHash256(buffer.toString('hex'), {});
    this.log('messageToHash');
    this.log(hash);
    return hash;
  }

  public async pubKeyToEthAddress(x: string, y: string) {
    return this.instance.pubKeyToEthAddress(x, y);
  }

  public async prefixString() {

    const bytes = await this.instance.prefixStr();
    const buffer = hexToBuf(bytes);
    return new TextDecoder("utf-8").decode(buffer);
  }

  // public async claim(dmdv3Address: string, payoutAddress: string, signature: string ) {
  //   ensurePrefixCache()
  // }

  public async getBalance(dmdV3Address: string) {

    const ripe = this.cryptoJS.dmdAddressToRipeResult(dmdV3Address);
    return await this.instance.balances(ensure0x(ripe));
  }

  // public async getContractBalance() {
  //   const address = await this.instance.getAddress();
  //   // get the balance of ths address.

  //   return await ethers.provider.getBalance(address);
  // }


  // public async fillBalances(sponsor: SignerWithAddress, balances: BalanceV3[]) {

  //     let totalBalance = ethers.toBigInt('0');
  //     let accounts: string[] = [];
  //     let balancesForContract: string[] = [];

  //     for (const balance of balances) {
  //         accounts.push(ensure0x(this.cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address)));
  //         balancesForContract.push(balance.value);
  //         totalBalance = totalBalance + ethers.toBigInt(balance.value);
  //     }

  //     // console.log(accounts);
  //     // console.log(balancesForContract);
  //     // console.log(totalBalance);

  //     const fillTx = await (await this.instance.connect(sponsor).fill(accounts, balancesForContract, { value: totalBalance })).wait();
      
  //     this.log("contract address:", await this.instance.getAddress())
  //     if (fillTx ) {
  //       const hash = fillTx.hash;
  //       this.log("fillTx hash:", hash);
  //       const response = await fillTx.getTransaction();
  //       if (response) {
  //         //console.log("fillTx data:", response.data);
  //         this.log("fillTx hash:", hash);
  //         this.log("fillTx data length (bytes):", response.data.length / 2);
  //       }
  //     }

  //     // console.log("result status", txResult?.status);
  //     //console.log(await txResult?.getResult());
  //     return totalBalance;
  // }
}
