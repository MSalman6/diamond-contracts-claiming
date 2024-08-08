/// <reference types="node" />
import { ethers } from "ethers";
import { ClaimContract } from '../../typechain-types/index';
import { CryptoJS } from './cryptoJS';
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BalanceV3 } from "../data/interfaces";
/**
 * Crypto functions used in this project implemented in Soldity.
 */
export declare class CryptoSol {
    instance: ClaimContract;
    cryptoJS: CryptoJS;
    private logDebug;
    constructor(instance: ClaimContract);
    claim(dmdV3Address: string, dmdV4Address: string, signature: string, postfix: string): Promise<ethers.ContractTransactionReceipt | null>;
    recoverV(dmdV4Address: string, postfixHex: string, pubKeyX: string, pubKeyY: string, r: Buffer, s: Buffer): Promise<string>;
    setLogDebug(value: boolean): void;
    private log;
    messageToHash(messageString: string): Promise<string>;
    pubKeyToEthAddress(x: string, y: string): Promise<string>;
    prefixString(): Promise<string>;
    getBalance(dmdV3Address: string): Promise<bigint>;
    fillBalances(claimContract: ClaimContract, sponsor: SignerWithAddress, balances: BalanceV3[]): Promise<bigint>;
}
