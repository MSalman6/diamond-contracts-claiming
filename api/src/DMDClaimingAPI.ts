import { ethers } from "hardhat";
import { ClaimContract } from '../../typechain-types/index';
import { ensure0x, remove0x, stringToUTF8Hex, toHexString } from './cryptoHelpers';
import { DMDClaimingHelpers } from './DMDClaimingHelpers';
import { hexToBuf } from './cryptoHelpers';


let base58check = require('base58check'); 

/**
 * Crypto functions used in this project implemented in Soldity.
 */
export class DMDClaimingAPI {

  public cryptoJS = new DMDClaimingHelpers();

  private logDebug: boolean = false;

  public static async fromContractAddress(contractAddress: string): Promise<DMDClaimingAPI> {

    const contract: any = await ethers.getContractAt("ClaimContract", contractAddress);
    return new DMDClaimingAPI(contract);
  }

  /// Creates an instance if you already have a ClaimContract instance.
  /// use static method fromContractAddress() for creating an instance from a contract address.
  public constructor(public contract: ClaimContract) {
    if (contract === undefined || contract === null) {
      throw Error("Claim contract must be defined!!");
    }
  }

  /// claims the DMDv3 address with the given signature.
  /// @param dmdV4Address The DMDv4 address to claim.
  /// @param signature The signature of the claim, made with a DMDv3 wallet.
  /// @param postfix optional postfix to add to the claim message.
  /// @param dmdSig true if the signature is made with a DMD wallet, false if it is made with a Bitcoin wallet.
  public async claim(dmdV4Address: string, signature: string, postfix: string, dmdSig: boolean) {
    
    let postfixHex = stringToUTF8Hex(postfix);

    const claimMessage = await this.contract.createClaimMessage(dmdV4Address, true, postfixHex, dmdSig);
    this.log('Claim Message: ' , claimMessage);

    let prefixString = await this.prefixString();
    const pubkey = this.cryptoJS.getPublicKeyFromSignature(signature,  prefixString + dmdV4Address + postfix, dmdSig);

    const rs = this.cryptoJS.signatureBase64ToRSV(signature);

    let pubKeyX = ensure0x(pubkey.x);
    let pubKeyY = ensure0x(pubkey.y);

    this.log("pub key x:", pubKeyX);
    this.log("pub key y:", pubKeyY);
    
    let dmdV3AddressFromSignaturesHex = await this.contract.publicKeyToBitcoinAddress(pubKeyX, pubKeyY, 1);

    this.log('dmdV3AddressFromSignaturesHex:   ', dmdV3AddressFromSignaturesHex);
    this.log('dmdV3AddressFromSignaturesBase58:', base58check.encode(remove0x(dmdV3AddressFromSignaturesHex)));

    let v = await this.recoverV(dmdV4Address, true, postfixHex, pubKeyX, pubKeyY, rs.r, rs.s, dmdSig);

    let claimOperation = this.contract.claim(dmdV4Address, true, postfixHex, pubKeyX, pubKeyY, v, rs.r, rs.s, dmdSig, { gasLimit: 200_000, gasPrice: "1000000000" });
    let receipt = await (await claimOperation).wait();
    // console.log("receipt: ", receipt?.toJSON())
    return receipt;
  }

  /// Recovers the V value of the signature by probing the 2 possible values.
  /// throws an error if the signature does not match.
  public async recoverV(dmdV4Address: string, claimAddressChecksum: boolean, postfixHex: string, pubKeyX: string, pubKeyY: string, r: Buffer, s: Buffer, dmdSig: boolean) : Promise<string> {

    if (await this.contract.claimMessageMatchesSignature(dmdV4Address, claimAddressChecksum, postfixHex, pubKeyX, pubKeyY, "0x1b", r, s, dmdSig)) { 
      return "0x1b";
    }

    if (await this.contract.claimMessageMatchesSignature(dmdV4Address, claimAddressChecksum, postfixHex, pubKeyX, pubKeyY, "0x1c", r, s, dmdSig)) { 
      return "0x1c";
    }

    throw Error("Could not match signature");
  }

  public setLogDebug(value: boolean) {
    this.logDebug = value;
    this.cryptoJS.setLogDebug(value);
  }

  // private async ensurePrefixCache() {
  //   if (this.prefixCache === '') {
  //     this.prefixCache = await this.prefixString();
  //   }
  // }

  private log(message: string, ...params: any[]) {
    if (this.logDebug) {
      console.log(message, ...params);
    }
  }

  /**
   * Retrieves the message that is used for hashing in bitcoin. (enpacking it with the Envolope)
   * see also: https://bitcoin.stackexchange.com/questions/77324/how-are-bitcoin-signed-messages-generated
   * @param address Ethereum style address, include checksum information.
   */
  public async addressToClaimMessage(address: string, postfix: string = '', dmdSig: boolean = false): Promise<string> {

    const postfixHex = stringToUTF8Hex(postfix);

    const claimMessage = await this.contract.createClaimMessage(address, true, postfixHex, dmdSig);
    this.log('Claim Message:');
    this.log(claimMessage);
    return claimMessage;
  }

  /// Returns the Sha256 hash of the given message,
  /// using the contract to do so.
  public async messageToHash(messageString: string) {

    const buffer = Buffer.from(messageString, 'utf-8');
    const hash = await this.contract.calcHash256(buffer.toString('hex'), {});
    this.log('messageToHash');
    this.log(hash);
    return hash;
  }

  /// test if a claim message matches a signature.
  public async claimMessageMatchesSignature(
    claimToAddress: string,
    addressContainsChecksum: boolean,
    postfix: string,
    pubkeyX: string,
    pubkeyY: string,
    sigV: string,
    sigR: string,
    sigS: string,
    dmd: boolean):
    Promise<boolean> {
    const result =
      await this.contract.claimMessageMatchesSignature(
        claimToAddress,
        addressContainsChecksum,
        stringToUTF8Hex(postfix),
        ensure0x(pubkeyX),
        ensure0x(pubkeyY),
        ensure0x(sigV),
        ensure0x(sigR),
        ensure0x(sigS), 
        dmd);
    this.log('Claim Result: ', result);
    return result;
  }

  /// Returns the Ethereum address of the given signature.
  public async getEthAddressFromSignature(
    claimToAddress: string,
    addressContainsChecksum: boolean,
    postfix: string,
    sigV: string,
    sigR: string | Buffer,
    sigS: string | Buffer,
    dmd: boolean)
    : Promise<string> {

    return this.contract.getEthAddressFromSignature(
      claimToAddress,
      addressContainsChecksum,
      stringToUTF8Hex(postfix),
      ensure0x(sigV),
      ensure0x(sigR),
      ensure0x(sigS),
      dmd
    );
  }

  /**
   * returns the essential part of a Bitcoin-style legacy compressed address associated with the given ECDSA public key
   * @param x X coordinate of the ECDSA public key
   * @param y Y coordinate of the ECDSA public key
   * @returns Hex string holding the essential part of the legacy compressed address associated with the given ECDSA public key
   */
  async publicKeyToBitcoinAddressEssential(x: bigint, y: bigint): Promise<string> {
    const legacyCompressedEnumValue = 1;

    return this.contract.publicKeyToBitcoinAddress(
      toHexString(x),
      toHexString(y),
      legacyCompressedEnumValue
    );
  }

  async publicKeyToBitcoinAddress(x: bigint, y: bigint, addressPrefix: string) {
    const essentialPart = await this.publicKeyToBitcoinAddressEssential(x, y);
    return this.cryptoJS.bitcoinAddressEssentialToFullQualifiedAddress(essentialPart, addressPrefix);
  }

  /// return the ethereum pseudo address of the deployed contract as UTF-8.
  public async pubKeyToEthAddress(x: string, y: string) {
    return this.contract.pubKeyToEthAddress(x, y);
  }

   /// return the prefix string of the deployed contract as UTF-8.
  public async prefixString() {

    const bytes = await this.contract.prefixStr();
    const buffer = hexToBuf(bytes);
    return new TextDecoder("utf-8").decode(buffer);
  }

  /// adds additional balance to the contract.
  public async addBalance(dmdV3Address: string, value: string) {

    const signers = await ethers.getSigners();
    const fromAccount = signers[0];
    const ripe = this.cryptoJS.dmdAddressToRipeResult(dmdV3Address);

    return (await this.contract.connect(fromAccount).addBalance(ensure0x(ripe), { value: value })).wait();
  }


  /// Returns the balance of the given DMD V3 address.
  public async getBalance(dmdV3Address: string) : Promise<bigint> {

    const ripe = this.cryptoJS.dmdAddressToRipeResult(dmdV3Address);
    return this.contract.balances(ensure0x(ripe));
  }

  /// Returns the total balance of the claiming pot.
  public async getContractBalance() : Promise<bigint> {
    const address = await this.contract.getAddress();
    // get the balance of ths address.

    return ethers.provider.getBalance(address);
  }
}
