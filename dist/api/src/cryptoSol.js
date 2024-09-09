"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoSol = void 0;
const cryptoHelpers_1 = require("./cryptoHelpers");
const cryptoJS_1 = require("./cryptoJS");
const cryptoHelpers_2 = require("./cryptoHelpers");
let base58check = require('base58check');
/**
 * Crypto functions used in this project implemented in Soldity.
 */
class CryptoSol {
    // public static async fromContractAddress(contractAddress: string): Promise<CryptoSol> {
    //   const contract: any = await ethers.getContractAt("ClaimContract", contractAddress);
    //   return new CryptoSol(contract);
    // }
    /// Creates an instance if you already have a ClaimContract instance.
    /// use static method fromContractAddress() for creating an instance from a contract address.
    constructor(instance) {
        this.instance = instance;
        this.cryptoJS = new cryptoJS_1.CryptoJS();
        this.logDebug = false;
        if (instance === undefined || instance === null) {
            throw Error("Claim contract must be defined!!");
        }
    }
    async claim(dmdV3Address, dmdV4Address, signature, postfix) {
        let postfixHex = (0, cryptoHelpers_1.stringToUTF8Hex)(postfix);
        const claimMessageHex = await this.instance.createClaimMessage(dmdV4Address, postfixHex);
        this.log('Claiming:');
        this.log('dmdV3Address:', dmdV3Address);
        this.log('dmdV4Address:', dmdV3Address);
        this.log('signature:', signature);
        this.log('postfix:', postfix);
        this.log('Claim Message hex: ', claimMessageHex);
        // convert the hexstring to a string.
        const claimMessage = (0, cryptoHelpers_2.hexToBuf)(claimMessageHex).toString('utf-8');
        this.log("claimMessage: ", claimMessage);
        let prefixString = await this.prefixString();
        const pubkey = this.cryptoJS.getPublicKeyFromSignature(signature, prefixString + dmdV4Address + postfix, true);
        const rs = this.cryptoJS.signatureBase64ToRSV(signature);
        let pubKeyX = (0, cryptoHelpers_1.ensure0xb32)(pubkey.x);
        let pubKeyY = (0, cryptoHelpers_1.ensure0xb32)(pubkey.y);
        this.log("pub key x:", pubKeyX);
        this.log("pub key y:", pubKeyY);
        let dmdV3AddressFromSignaturesHex = await this.instance.publicKeyToDMDAddress(pubKeyX, pubKeyY);
        this.log('dmdV3AddressFromSignaturesHex:   ', dmdV3AddressFromSignaturesHex);
        this.log('dmdV3AddressFromSignaturesBase58:', base58check.encode((0, cryptoHelpers_1.remove0x)(dmdV3AddressFromSignaturesHex)));
        this.log('dmdV3AddressFromDataBase58:      ', dmdV3Address);
        let v = await this.recoverV(dmdV4Address, postfixHex, pubKeyX, pubKeyY, rs.r, rs.s);
        let claimOperation = this.instance.claim(dmdV4Address, postfixHex, pubKeyX, pubKeyY, v, rs.r, rs.s, { gasLimit: 200000, gasPrice: "1000000000" });
        let receipt = await (await claimOperation).wait();
        // console.log("receipt: ", receipt?.toJSON())
        return receipt;
    }
    async recoverV(dmdV4Address, postfixHex, pubKeyX, pubKeyY, r, s) {
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
    setLogDebug(value) {
        this.logDebug = value;
        this.cryptoJS.setLogDebug(value);
    }
    // private async ensurePrefixCache() {
    //   if (this.prefixCache === '') {
    //     this.prefixCache = await this.prefixString();
    //   }
    // }
    log(message, ...params) {
        if (this.logDebug) {
            console.log(message, ...params);
        }
    }
    async messageToHash(messageString) {
        const buffer = Buffer.from(messageString, 'utf-8');
        const hash = await this.instance.calcHash256(buffer.toString('hex'), {});
        this.log('messageToHash');
        this.log(hash);
        return hash;
    }
    async pubKeyToEthAddress(x, y) {
        return this.instance.pubKeyToEthAddress(x, y);
    }
    async prefixString() {
        const bytes = await this.instance.prefixStr();
        const buffer = (0, cryptoHelpers_2.hexToBuf)(bytes);
        return new TextDecoder("utf-8").decode(buffer);
    }
    // public async claim(dmdv3Address: string, payoutAddress: string, signature: string ) {
    //   ensurePrefixCache()
    // }
    async getBalance(dmdV3Address) {
        const ripe = this.cryptoJS.dmdAddressToRipeResult(dmdV3Address);
        return await this.instance.balances((0, cryptoHelpers_1.ensure0x)(ripe));
    }
}
exports.CryptoSol = CryptoSol;
