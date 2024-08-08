"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoJS = void 0;
const bs58check_1 = __importDefault(require("bs58check"));
const elliptic_1 = __importDefault(require("elliptic"));
const cryptoHelpers_1 = require("./cryptoHelpers");
const varuint_bitcoin_1 = __importDefault(require("varuint-bitcoin"));
const bitcoinjs_message_1 = __importDefault(require("bitcoinjs-message"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const secp256k1 = __importStar(require("secp256k1"));
const hardhat_1 = require("hardhat");
let base58check = require('base58check');
const SEGWIT_TYPES = {
    P2WPKH: 'p2wpkh',
    P2SH_P2WPKH: 'p2sh(p2wpkh)'
};
// const metadata = {
//   diamond: {
//   messagePrefix: '\x18Diamond Signed Message:\n',
//   bip32: {
//     public: 0x0488B21E,
//     private: 0x0488ADE4,
//   },
//   pubKeyHash: 0x5a,
//   scriptHash: 0x08,
//   wif: 0xda,
//   },
//   bitcoin: {
//     messagePrefix:"\x18Bitcoin Signed Message:\n",
//     bech32:"bc",
//     bip32:
//     {
//       public:76067358,
//       private:76066276
//     },
//     pubKeyHash:0,
//     scriptHash:5,
//     wif:128}
// }
/**
 * Crypto functions used in this project implemented in JS.
 */
class CryptoJS {
    constructor() {
        this.logDebug = false;
    }
    setLogDebug(value) {
        this.logDebug = value;
    }
    log(message, ...params) {
        if (this.logDebug) {
            console.log(message, ...params);
        }
    }
    /**
     * returns the DMD Diamond V3 address from the public key.
     * @param x x coordinate of the public key, with prefix 0x
     * @param y y coordinate of the public key, with prefix 0x
     */
    publicKeyToBitcoinAddress(publicKey) {
        // const hash = bitcoinMessage.magicHash(publicKeyBuffer, CryptoJS.getSignaturePrefix(false));
        // const publicKey = secp256k1.publicKeyConvert(publicKeyBuffer, true);
        //const address = bitcoinMessage.pubKeyToAddress(publicKey, true);
        //return address;
        //const publicKeyBuffer = Buffer.from(x.slice(2) + y.slice(2), 'hex');
        const pubkey = Buffer.from((0, cryptoHelpers_1.remove0x)(publicKey), 'hex');
        const { address } = bitcoin.payments.p2pkh({ pubkey });
        return address;
        // todo: support DMD here
        let network = bitcoin.networks.bitcoin;
        //return bitcoin.address.fromOutputScript(publicKeyBuffer, network);
        // Parse the public key
        //const publicKey = Buffer.from(publicKeyBuffer);
        // Generate the Bitcoin address
        //const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer });
    }
    /**
     *
     * @param address dmd or bitcoin style address.
     * @return Buffer with the significant bytes of the public key, not including the version number prefix, or the checksum postfix.
     */
    dmdAddressToRipeResult(address) {
        this.log('address:', address);
        const decoded = bs58check_1.default.decode(address);
        // Assume first byte is version number
        let buffer = Buffer.from(decoded.slice(1));
        return buffer;
    }
    signatureBase64ToRSV(signatureBase64) {
        const sig = Buffer.from(signatureBase64, 'base64');
        this.log('sigBuffer:');
        this.log(sig.toString('hex'));
        const sizeOfRComponent = sig[0];
        if (sizeOfRComponent !== 32) {
            this.log(`invalid size of R in signature: ${sizeOfRComponent}:`, signatureBase64);
        }
        const rStart = 1; // r Start is always one (1).
        const sStart = 1 + sizeOfRComponent;
        const sizeOfSComponent = sig.length - sStart;
        if (sizeOfSComponent !== 32) {
            this.log(`invalid size of S in signature: ${sizeOfRComponent}:`, signatureBase64);
        }
        if (sizeOfRComponent > sig.length) {
            throw new Error('sizeOfRComponent is too Big!!');
        }
        const r = sig.subarray(rStart, rStart + sizeOfRComponent);
        const s = sig.subarray(sStart, 65);
        this.log(`r: ${r.toString('hex')}`);
        this.log(`s: ${s.toString('hex')}`);
        //bitcoinjs-lib
        return { r, s, };
    }
    decodeSignature(buffer) {
        if (buffer.length !== 65)
            throw new Error('Invalid signature length');
        const flagByte = buffer.readUInt8(0) - 27;
        if (flagByte > 15 || flagByte < 0) {
            throw new Error('Invalid signature parameter');
        }
        return {
            compressed: !!(flagByte & 12),
            segwitType: !(flagByte & 8)
                ? null
                : !(flagByte & 4)
                    ? SEGWIT_TYPES.P2SH_P2WPKH
                    : SEGWIT_TYPES.P2WPKH,
            recovery: flagByte & 3,
            signature: buffer.slice(1)
        };
    }
    getPublicKeyFromSignature(signatureBase64, messageContent, isDMDSigned) {
        //const signatureBase64 = "IBHr8AT4TZrOQSohdQhZEJmv65ZYiPzHhkOxNaOpl1wKM/2FWpraeT8L9TaphHI1zt5bI3pkqxdWGcUoUw0/lTo=";
        //const address = "";
        const signature = Buffer.from(signatureBase64, 'base64');
        const parsed = this.decodeSignature(signature);
        //this.log('parsed Signature:', parsed);
        // todo: add support for DMD specific signing prefix
        const hash = bitcoinjs_message_1.default.magicHash(messageContent, CryptoJS.getSignaturePrefix(isDMDSigned));
        const publicKey = secp256k1.ecdsaRecover(parsed.signature, parsed.recovery, hash, parsed.compressed);
        //we now have the public key
        //public key is the X Value with a prefix.
        //it's 02 or 03 prefix, depending if y is ODD or not.
        this.log("publicKey: ", hardhat_1.ethers.hexlify(publicKey));
        var ec = new elliptic_1.default.ec('secp256k1');
        const key = ec.keyFromPublic(publicKey);
        //const x = ethers.hexlify(publicKey.slice(1));
        //this.log("x: " + x);
        const x = (0, cryptoHelpers_1.ensure0x)(key.getPublic().getX().toString('hex'));
        const y = (0, cryptoHelpers_1.ensure0x)(key.getPublic().getY().toString('hex'));
        this.log("y: " + y);
        return { publicKey: hardhat_1.ethers.hexlify(publicKey), x, y };
    }
    getXYfromPublicKeyHex(publicKeyHex) {
        var ec = new elliptic_1.default.ec('secp256k1');
        var publicKey = ec.keyFromPublic(publicKeyHex.toLowerCase(), 'hex').getPublic();
        var x = publicKey.getX();
        var y = publicKey.getY();
        //this.log("pub key:" + publicKey.toString('hex'));
        //this.log("x :" + x.toString('hex'));
        //this.log("y :" + y.toString('hex'));
        return { x, y };
    }
    bitcoinAddressEssentialToFullQualifiedAddress(essentialPart, addressPrefix = '00') {
        // this.log('PublicKeyToBitcoinAddress:', essentialPart);
        let result = (0, cryptoHelpers_1.hexToBuf)(essentialPart);
        result = (0, cryptoHelpers_1.prefixBuf)(result, addressPrefix);
        //this.log('with prefix: ' + result.toString('hex'));
        return bs58check_1.default.encode(result);
    }
    /// creates a DMD Diamond Address from a RIPEMD-160 hash
    ripeToDMDAddress(ripe160Hash) {
        // Prepend the version byte
        let buff = (0, cryptoHelpers_1.prefixBuf)(ripe160Hash, "5a");
        //this.log('with prefix: ' + result.toString('hex'));
        return bs58check_1.default.encode(buff);
    }
    getSignedMessage(messagePrefix, message) {
        const messagePrefixBuffer = Buffer.from(messagePrefix, 'utf8');
        ;
        const messageBuffer = Buffer.from(message, 'utf8');
        const messageVISize = varuint_bitcoin_1.default.encodingLength(message.length);
        const buffer = Buffer.alloc(messagePrefix.length + messageVISize + message.length);
        messagePrefixBuffer.copy(buffer, 0);
        varuint_bitcoin_1.default.encode(message.length, buffer, messagePrefix.length);
        messageBuffer.copy(buffer, messagePrefix.length + messageVISize);
        return buffer;
    }
    static getSignaturePrefix(isDMDSigned) {
        return isDMDSigned ? '\u0018Diamond Signed Message:\n' : '\u0018Bitcoin Signed Message:\n';
    }
    getDMDSignedMessage(message) {
        return this.getSignedMessage(CryptoJS.getSignaturePrefix(true), message);
    }
    getBitcoinSignedMessage(message) {
        return this.getSignedMessage(CryptoJS.getSignaturePrefix(false), message);
    }
}
exports.CryptoJS = CryptoJS;
