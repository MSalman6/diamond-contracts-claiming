/// <reference types="node" />
import BN from 'bn.js';
/**
 * Crypto functions used in this project implemented in JS.
 */
export declare class CryptoJS {
    private logDebug;
    constructor();
    setLogDebug(value: boolean): void;
    private log;
    /**
     * returns the DMD Diamond V3 address from the public key.
     * @param x x coordinate of the public key, with prefix 0x
     * @param y y coordinate of the public key, with prefix 0x
     */
    publicKeyToBitcoinAddress(publicKey: string): string;
    /**
     *
     * @param address dmd or bitcoin style address.
     * @return Buffer with the significant bytes of the public key, not including the version number prefix, or the checksum postfix.
     */
    dmdAddressToRipeResult(address: string): Buffer;
    signatureBase64ToRSV(signatureBase64: string): {
        r: Buffer;
        s: Buffer;
    };
    decodeSignature(buffer: Buffer): {
        compressed: boolean;
        segwitType: string | null;
        recovery: number;
        signature: Buffer;
    };
    getPublicKeyFromSignature(signatureBase64: string, messageContent: string, isDMDSigned: boolean): {
        publicKey: string;
        x: string;
        y: string;
    };
    getXYfromPublicKeyHex(publicKeyHex: string): {
        x: BN;
        y: BN;
    };
    bitcoinAddressEssentialToFullQualifiedAddress(essentialPart: string, addressPrefix?: string): string;
    ripeToDMDAddress(ripe160Hash: Buffer): string;
    getSignedMessage(messagePrefix: string, message: string): Buffer;
    static getSignaturePrefix(isDMDSigned: boolean): string;
    getDMDSignedMessage(message: string): Buffer;
    getBitcoinSignedMessage(message: string): Buffer;
}
