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
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const helpers = __importStar(require("@nomicfoundation/hardhat-network-helpers"));
const elliptic_1 = __importDefault(require("elliptic"));
const bn_js_1 = __importDefault(require("bn.js"));
const cryptoJS_1 = require("../api/src/cryptoJS");
const cryptoHelpers_1 = require("../api/src/cryptoHelpers");
const signature_1 = require("./fixtures/signature");
const balances_1 = require("./fixtures/balances");
const cryptoSol_1 = require("../api/src/cryptoSol");
function getDilluteTimestamps() {
    let now = Math.floor(Date.now() / 1000);
    let dillute1 = now + (86400 * 2 * 31) + 86400 * 30;
    let dillute2 = now + (86400 * 3 * 31) + (86400 * 3 * 30);
    let dillute3 = now + (86400 * 4 * 365) + (86400 * 366);
    return { dillute1, dillute2, dillute3 };
}
describe('ClaimContract', () => {
    let signers;
    let lateClaimBeneficorAddress;
    let lateClaimBeneficorDAO;
    let cryptoJS;
    async function deployClaiming(claimBeneficorAddress, beneficorDAOAddress, prefix) {
        const contractFactory = await hardhat_1.ethers.getContractFactory("ClaimContract");
        let dilluteTimestamps = getDilluteTimestamps();
        let prefixHex = (0, cryptoHelpers_1.stringToUTF8Hex)(prefix);
        const claimContract = await contractFactory.deploy(claimBeneficorAddress, beneficorDAOAddress, prefixHex, dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3);
        await claimContract.waitForDeployment();
        // why we need to bypass type checks here ?
        return claimContract;
    }
    async function deployFixtureWithNoPrefix() {
        return deployFixture('');
    }
    async function deployFixture(prefixHex) {
        let claimContract = await deployClaiming(lateClaimBeneficorAddress, lateClaimBeneficorDAO, prefixHex);
        return { claimContract };
    }
    async function verifySignature(claimContract, claimToAddress, signatureBase64, postfix = '') {
        const prefixBytes = await claimContract.prefixStr();
        const prefixBuffer = (0, cryptoHelpers_1.hexToBuf)(prefixBytes);
        const prefixString = new TextDecoder("utf-8").decode(prefixBuffer);
        const key = cryptoJS.getPublicKeyFromSignature(signatureBase64, prefixString + claimToAddress + postfix, true);
        const rs = cryptoJS.signatureBase64ToRSV(signatureBase64);
        const txResult1 = await claimContract.claimMessageMatchesSignature(claimToAddress, (0, cryptoHelpers_1.stringToUTF8Hex)(postfix), (0, cryptoHelpers_1.ensure0x)(key.x), (0, cryptoHelpers_1.ensure0x)(key.y), (0, cryptoHelpers_1.ensure0x)('0x1b'), (0, cryptoHelpers_1.ensure0x)(rs.r.toString('hex')), (0, cryptoHelpers_1.ensure0x)(rs.s.toString('hex')));
        const txResult2 = await claimContract.claimMessageMatchesSignature(claimToAddress, (0, cryptoHelpers_1.stringToUTF8Hex)(postfix), (0, cryptoHelpers_1.ensure0x)(key.x), (0, cryptoHelpers_1.ensure0x)(key.y), (0, cryptoHelpers_1.ensure0x)('0x1c'), (0, cryptoHelpers_1.ensure0x)(rs.r.toString('hex')), (0, cryptoHelpers_1.ensure0x)(rs.s.toString('hex')));
        (0, chai_1.expect)(txResult1 || txResult2).to.be.equal(true, "Claim message did not match the signature");
    }
    before(async () => {
        signers = await hardhat_1.ethers.getSigners();
        // this 2 address will are contracts addresses in Diamond.
        // this ClaimingContract contract only fills those 2 addresses.
        // the example address are also the address the deployment of the DAO and the Core contract will happen on the real network.
        lateClaimBeneficorAddress = "0x2000000000000000000000000000000000000001";
        lateClaimBeneficorDAO = "0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0";
        cryptoJS = new cryptoJS_1.CryptoJS();
    });
    describe("deployment", () => {
        it('should deploy contract', async () => {
            const contractFactory = await hardhat_1.ethers.getContractFactory("ClaimContract");
            // get current timestamp:
            // dillute1 =  deploymentTimestamp + (1 days * 2 * 31) + 1 days * 30;
            // dillute2 =  deploymentTimestamp + (1 days * 3 * 31) + (1 days * 3 * 30);
            // dillute3 =  deploymentTimestamp + (YEAR_IN_SECONDS * 4) + LEAP_YEAR_IN_SECONDS;
            let dilluteTimestamps = getDilluteTimestamps();
            const contract = await contractFactory.deploy(lateClaimBeneficorAddress, lateClaimBeneficorDAO, '0x', dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3);
            (0, chai_1.expect)(await contract.waitForDeployment());
        });
        it('should not deploy with wrong constructor arguments', async () => {
            const contractFactory = await hardhat_1.ethers.getContractFactory("ClaimContract");
            // get current timestamp:
            // dillute1 =  deploymentTimestamp + (1 days * 2 * 31) + 1 days * 30;
            // dillute2 =  deploymentTimestamp + (1 days * 3 * 31) + (1 days * 3 * 30);
            // dillute3 =  deploymentTimestamp + (YEAR_IN_SECONDS * 4) + LEAP_YEAR_IN_SECONDS;
            let dilluteTimestamps = getDilluteTimestamps();
            await (0, chai_1.expect)(contractFactory.deploy(lateClaimBeneficorAddress, lateClaimBeneficorDAO, '0x', '0x0', // <-- First timestamp in the past.
            dilluteTimestamps.dillute1, dilluteTimestamps.dillute3)).to.be.revertedWithCustomError(contractFactory, "InitializationErrorDiluteTimestamp1");
            await (0, chai_1.expect)(contractFactory.deploy(lateClaimBeneficorAddress, lateClaimBeneficorDAO, '0x', dilluteTimestamps.dillute2, dilluteTimestamps.dillute1, // <-- wrong order
            dilluteTimestamps.dillute3)).to.be.revertedWithCustomError(contractFactory, "InitializationErrorDiluteTimestamp2");
            await (0, chai_1.expect)(contractFactory.deploy(lateClaimBeneficorAddress, lateClaimBeneficorDAO, '0x', dilluteTimestamps.dillute1, dilluteTimestamps.dillute3, dilluteTimestamps.dillute2 // <-- wrong order
            )).to.be.revertedWithCustomError(contractFactory, "InitializationErrorDiluteTimestamp3");
            await (0, chai_1.expect)(contractFactory.deploy(lateClaimBeneficorAddress, hardhat_1.ethers.ZeroAddress, // <-- DaoAddress Zero
            '0x', dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3)).to.be.revertedWithCustomError(contractFactory, "InitializationErrorDaoAddressNull");
            await (0, chai_1.expect)(contractFactory.deploy(hardhat_1.ethers.ZeroAddress, // <-- Reinsert Pot Zero 
            lateClaimBeneficorDAO, '0x', dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3)).to.be.revertedWithCustomError(contractFactory, "InitializationErrorReinsertPotAddressNull");
        });
    });
    describe("cryptographics", () => {
        it('should correctly calculate address checksum', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
            const address = '0xfec7b00dc0192319dda0c777a9f04e47dc49bd18';
            const addressWithChecksum = '0xfEc7B00DC0192319DdA0c777A9F04E47Dc49bD18';
            const calcAddressResult = await claimContract.calculateAddressString(address);
            const buffer = Buffer.from((0, cryptoHelpers_1.remove0x)(calcAddressResult), 'hex');
            const calcResult = buffer.toString('utf8');
            (0, chai_1.expect)(calcResult).to.be.equal(addressWithChecksum, 'checksum must be calculated in a correct ways.');
        });
        it('should create correct claim message', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
            const address = '0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F';
            const resultJS = (0, cryptoHelpers_1.ensure0x)(cryptoJS.getDMDSignedMessage(address).toString('hex'));
            const postfixHex = (0, cryptoHelpers_1.stringToUTF8Hex)('');
            const result = await claimContract.createClaimMessage(address, postfixHex);
            (0, chai_1.expect)(result).to.be.equal(resultJS);
        });
        it('should create correct claim message dmd with prefix', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
            const prefix = '';
            const address = '0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F';
            const resultJS = (0, cryptoHelpers_1.ensure0x)(cryptoJS.getDMDSignedMessage(prefix + address).toString('hex'));
            const postfixHex = (0, cryptoHelpers_1.stringToUTF8Hex)('');
            const result = await claimContract.createClaimMessage(address, postfixHex);
            (0, chai_1.expect)(result).to.be.equal(resultJS);
        });
        it('should convert pub key to eth address', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
            // BIP39 Mnemonic: "hello slim hope" - really, i got this Mnemonic from RNG...
            // address 0: 0x7af37454aCaB6dB76c11bd33C94ED7C0b7A60B2a
            // Public:    0x03ff2e6a372d6beec3b02556971bfc87b9fb2d7e27fe99398c11693571080310d8
            // Private:   0xc99dd56045c449952e16388925455cc32e4eb180f2a9c3d2afd587aaf1cceda5
            const expectedAddress = '0x7af37454aCaB6dB76c11bd33C94ED7C0b7A60B2a';
            const inputPrivateKey = 'c99dd56045c449952e16388925455cc32e4eb180f2a9c3d2afd587aaf1cceda5';
            var ec = new elliptic_1.default.ec('secp256k1');
            var G = ec.g; // Generator point
            var pk = new bn_js_1.default(inputPrivateKey, 'hex'); // private key as big number
            var pubPoint = G.mul(pk); // EC multiplication to determine public point
            var x = pubPoint.getX().toBuffer(); //32 bit x co-ordinate of public point
            var y = pubPoint.getY().toBuffer(); //32 bit y co-ordinate of public point
            const result = await claimContract.pubKeyToEthAddress(x, y);
            (0, chai_1.expect)(result).to.equal(expectedAddress);
        });
        it('should convert BTC address to RIPE result', async () => {
            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds
            const address = '1Q9G4T5rLaf4Rz39WpkwGVM7e2jMxD2yRj';
            const expectedRipeResult = 'FDDACAAF7D90A0D7FC90106C3A64ED6E3A2CF859'.toLowerCase();
            const realRipeResult = cryptoJS.dmdAddressToRipeResult(address).toString('hex');
            (0, chai_1.expect)(realRipeResult).to.equal(expectedRipeResult);
        });
        it('should convert public key to to Bitcoin Address', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds
            const publicKeyHex = '035EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040';
            const expectedAddress = '1Q9G4T5rLaf4Rz39WpkwGVM7e2jMxD2yRj';
            const { x, y } = cryptoJS.getXYfromPublicKeyHex(publicKeyHex);
            const essentialPart = await claimContract.publicKeyToBitcoinAddress((0, cryptoHelpers_1.ensure0x)(x.toString('hex')), (0, cryptoHelpers_1.ensure0x)(y.toString('hex')));
            const bs58Result = cryptoJS.bitcoinAddressEssentialToFullQualifiedAddress(essentialPart, '00');
            (0, chai_1.expect)(bs58Result).to.equal(expectedAddress);
            console.log();
            // we are also cross checking the result with the result from the cryptoJS library,
            // (that uses bitcoin payments internaly to verify)
            const addressFromCryptJS = cryptoJS.publicKeyToBitcoinAddress(publicKeyHex);
            (0, chai_1.expect)(bs58Result).to.equal(addressFromCryptJS);
        });
        it('JS: should recover public key from signature', async () => {
            //https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            //passphrase: bit.diamonds
            const message = "0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F";
            const signatureBase64 = "IBHr8AT4TZrOQSohdQhZEJmv65ZYiPzHhkOxNaOpl1wKM/2FWpraeT8L9TaphHI1zt5bI3pkqxdWGcUoUw0/lTo=";
            const key = cryptoJS.getPublicKeyFromSignature(signatureBase64, message, false);
            (0, chai_1.expect)(key.x).equal("0x5EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
            (0, chai_1.expect)(key.y).equal("0x99523EB43291A1067FA819AA5A74F30810B19D15F6EDC19C9D8AA525B0F6C683".toLowerCase());
            (0, chai_1.expect)(key.publicKey).equal("0x035EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
        });
        it('JS: should recover public key from signatures, test signatures set.', async () => {
            // Same test as previous
            // But with multi signatures of the same key.
            // in order to cover different signatures variations,
            // like short S and short R
            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds
            // signatures created with: https://reinproject.org/bitcoin-signature-tool/#sign
            const message = "0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F";
            const signaturesBase64 = (0, signature_1.getTestSignatures)();
            for (let index = 0; index < signaturesBase64.length; index++) {
                const signatureBase64 = signaturesBase64[index];
                const key = cryptoJS.getPublicKeyFromSignature(signatureBase64, message, false);
                (0, chai_1.expect)(key.x).equal("0x5EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
                (0, chai_1.expect)(key.y).equal("0x99523EB43291A1067FA819AA5A74F30810B19D15F6EDC19C9D8AA525B0F6C683".toLowerCase());
                (0, chai_1.expect)(key.publicKey).equal("0x035EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
            }
        });
        async function runAddAndClaimTests(testSet) {
            let deployFixtureSpecified = () => {
                return deployFixture(testSet.messagePrefix);
            };
            const { claimContract } = await helpers.loadFixture(deployFixtureSpecified);
            const caller = signers[0];
            const balances = testSet;
            let cryptoSol = new cryptoSol_1.CryptoSol(claimContract);
            await cryptoSol.fillBalances(claimContract, caller, balances.balances);
            for (const balance of balances.balances) {
                let balanceBeforeClaim = await hardhat_1.ethers.provider.getBalance(balance.dmdv4Address);
                await cryptoSol.claim(balance.dmdv3Address, balance.dmdv4Address, balance.signature, "");
                let balanceAfterClaim = await hardhat_1.ethers.provider.getBalance(balance.dmdv4Address);
                let expectedBalance = hardhat_1.ethers.toBigInt(balance.value) + balanceBeforeClaim;
                (0, chai_1.expect)(balanceAfterClaim).to.equal(expectedBalance, 'Balance of DMDv4 adress matches defined Balance.');
            }
        }
        describe("cryptographics with defined message prefix", async function () {
            const claimToString = (0, cryptoHelpers_1.stringToUTF8Hex)('claim to ');
            async function deployWithPrefixFixture() {
                const claimContract = await deployClaiming(lateClaimBeneficorAddress, lateClaimBeneficorDAO, claimToString);
                return { claimContract };
            }
        });
        describe("balance", async function () {
            it('fill() a balance testset', async () => {
                let deployFreshFixtureForBalanceTest = () => deployFixtureWithNoPrefix();
                const { claimContract } = await helpers.loadFixture(deployFreshFixtureForBalanceTest);
                const caller = signers[0];
                const testbalances = (0, balances_1.getTestBalances)();
                let cryptoSol = new cryptoSol_1.CryptoSol(claimContract);
                let expectedTotalBalance = await cryptoSol.fillBalances(claimContract, caller, testbalances);
                const totalBalance = await hardhat_1.ethers.provider.getBalance(await claimContract.getAddress());
                (0, chai_1.expect)(totalBalance).to.equal(expectedTotalBalance, 'Balance of contract should be the total of all added funds.');
                for (const balance of testbalances) {
                    const currentBalance = await claimContract.balances(cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address));
                    (0, chai_1.expect)(currentBalance.toString()).to.equal(balance.value, 'Balance of DMDv3 adress matches defined Balance.');
                }
            });
        });
        describe("dilution", async function () {
            // it("dilute a testset", async () => {
            //     let testbalances = getTestBalances_BTC();
            //     for (let balance of testbalances.balances) {
            //         balance.value
            //     }
            // });
            // DMD claiming is known to fail.
            // it("claiming DMD", async () => {
            //     await runAddAndClaimTests(getTestBalances_DMD());
            // });
        });
        //             117.869,94
        // 70.721,96
        // 165.017,91
        describe("DMD Diamond", async function () {
            it("DMD Signatures from same address point to same public key.", async () => {
                let testset = (0, balances_1.getTestBalances_DMD_cli_same_address)();
                let x = "";
                let y = "";
                const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
                //let cryptoSol = new CryptoSol(claimContract);
                for (let balance of testset.balances) {
                    let key = cryptoJS.getPublicKeyFromSignature(balance.signature, balance.dmdv4Address, testset.isDMDSigned);
                    //cryptoJS.publicKeyToBTCStyleAddress(key.x, key.y, true);
                    //cryptoJS.bitcoinAddressEssentialToFullQualifiedAddress()
                    if (x === "") {
                        x = key.x;
                        y = key.y;
                    }
                    else {
                        (0, chai_1.expect)(x).to.equal(key.x, "Public key is not the same for all signatures.");
                        (0, chai_1.expect)(y).to.equal(key.y, "Public key is not the same for all signatures.");
                    }
                }
            });
            it("rejecting double add balances for defined DMD address", async () => {
                const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);
                await (0, chai_1.expect)(runAddAndClaimTests((0, balances_1.getTestBalances_DMD_cli_same_address)())).to.revertedWithCustomError(claimContract, "FillErrorAccountAlreadyDefined");
            });
            it("DMD address building from ripe.", async () => {
                let balances = (0, balances_1.getTestBalances)();
                for (let balance of balances) {
                    const ripeResult = cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address);
                    const dmdAddressFromRipe = cryptoJS.ripeToDMDAddress(ripeResult);
                    (0, chai_1.expect)(dmdAddressFromRipe).to.equal(balance.dmdv3Address);
                }
            });
        });
        describe("claiming", async function () {
            // DMD claiming is known to fail.
            it("claiming DMD", async () => {
                await runAddAndClaimTests((0, balances_1.getTestBalances_DMD_cli)());
            });
            it("claiming DMD with prefix", async () => {
                await runAddAndClaimTests((0, balances_1.getTestBalances_DMD_with_prefix)());
            });
        });
        describe("Dilution", function () {
            let claimContract;
            let sponsor;
            let totalAmountInClaimingPot = BigInt(0);
            //const ONE_DAY = 86400n;
            //const ETHER = BigInt(10n ** 18n);
            beforeEach(async function () {
            });
            it("should dilute balances and pay out correctly", async function () {
                [sponsor] = await hardhat_1.ethers.getSigners();
                let testBalances = (0, balances_1.getTestBalances_dillution)();
                claimContract = (await deployFixture(testBalances.messagePrefix)).claimContract;
                let sol = new cryptoSol_1.CryptoSol(claimContract);
                // sol.setLogDebug(true);
                totalAmountInClaimingPot = await sol.fillBalances(claimContract, sponsor, testBalances.balances);
                // Try to dilute before first dilution period - should fail
                await (0, chai_1.expect)(claimContract.dilute1()).to.be.revertedWithCustomError(claimContract, "DiluteTimeNotReached");
                let now = await claimContract.deploymentTimestamp();
                let claimingBalances = (0, balances_1.getTestBalances_dillution)();
                const [claimersEarly, claimersMid, claimersLate, claimersNever] = claimingBalances.balances;
                let claimPreconfiguredBalance = async (balance) => {
                    // console.log("claiming:", balance);
                    await sol.claim(balance.dmdv3Address, balance.dmdv4Address, balance.signature, "");
                };
                await claimPreconfiguredBalance(claimersEarly);
                // claiming all the coins that are expected to claim within first claiming period here.
                // those will receive 100% of coins
                // await sol.claim(claimersEarly.dmdv3Address, claimersEarly.dmdv4Address, claimersEarly.signature, "");
                // does the early claimer have the exact amount of coins than he should have ?
                let claimerBalanceEarly = await hardhat_1.ethers.provider.getBalance(claimersEarly.dmdv4Address);
                (0, chai_1.expect)(claimerBalanceEarly).to.be.equal(BigInt(claimersEarly.value));
                // a second claim must not be possible.
                await (0, chai_1.expect)(sol.claim(claimersEarly.dmdv3Address, claimersEarly.dmdv4Address, claimersEarly.signature, "")).to.be.revertedWithCustomError(claimContract, "ClaimErrorNoBalance");
                // we can not execute any of the dillution functions, because not enough time passed by.
                await (0, chai_1.expect)(claimContract.dilute1()).to.be.revertedWithCustomError(claimContract, "DiluteTimeNotReached");
                await (0, chai_1.expect)(claimContract.dilute2()).to.be.revertedWithCustomError(claimContract, "DiluteTimeNotReached");
                await (0, chai_1.expect)(claimContract.dilute3()).to.be.revertedWithCustomError(claimContract, "DiluteTimeNotReached");
                // Fast forward time to after first dilution period.
                await helpers.time.increaseTo((await claimContract.dilute_s1_75_timestamp()) + BigInt(1));
                // time has come, everybody can now call dilute1().
                // a programmed service will wait for this event and trigger the execution.
                await claimContract.dilute1();
                // but it is only able to be triggered once
                await (0, chai_1.expect)(claimContract.dilute1()).to.be.revertedWithCustomError(claimContract, "DiluteAllreadyHappened");
                // dilute 2 + 3 are still not triggerable.
                await (0, chai_1.expect)(claimContract.dilute2()).to.be.revertedWithCustomError(claimContract, "DiluteTimeNotReached");
                await (0, chai_1.expect)(claimContract.dilute3()).to.be.revertedWithCustomError(claimContract, "DiluteTimeNotReached");
                // dilute1() pays out not claimed coins to the DAO and the reinsert pot.
                // both will get 50% each.
                // not payed out coins is the dilution factor of 25% of the total balance of all remaining claims.
                const getRemainingBalance = (notClaimedBalances) => {
                    return notClaimedBalances.map(b => BigInt(b.value)).reduce((a, b) => a + b);
                };
                const remainingBalanceToClaimAfterEarly = getRemainingBalance([claimersMid, claimersLate, claimersNever]);
                // 25% of the balances that have not been claimed should go to the pots.
                let expectedTotalPotBalances1 = remainingBalanceToClaimAfterEarly / BigInt(4);
                // hint: because 1 can not be divided by 2, this test wont work with Odd Numbers.
                let expectedDaoBalance1 = expectedTotalPotBalances1 / BigInt(2);
                let expectedReinsertPotBalance1 = expectedTotalPotBalances1 / BigInt(2);
                // we can calculate expectations for dilute events already here.
                // at the second event, it is 50%. 
                // 25% already got claimed,
                // so it is another 25%, and we have to divide 4 again.
                let expectedDilution2 = getRemainingBalance([claimersLate, claimersNever]) / BigInt(4);
                let expectedDaoBalance2 = expectedDaoBalance1 + expectedDilution2 / BigInt(2);
                let expectedReinsertPotBalance2 = expectedReinsertPotBalance1 + expectedDilution2 / BigInt(2);
                // at the third event, 100% will get diluted.
                // since 25% + 25% of the funds already got diluted,
                // the expected dilution value is 50% of the rest of the coins. 
                let expectedDilution3 = getRemainingBalance([claimersNever]) / BigInt(2);
                let expectedDaoBalance3 = expectedDaoBalance2 + expectedDilution3 / BigInt(2);
                let expectedReinsertPotBalance3 = expectedReinsertPotBalance2 + expectedDilution3 / BigInt(2);
                // expectedDaoBalance1
                (0, chai_1.expect)(expectedDaoBalance1).to.be.equal(await hardhat_1.ethers.provider.getBalance(lateClaimBeneficorDAO));
                (0, chai_1.expect)(expectedReinsertPotBalance1).to.be.equal(await hardhat_1.ethers.provider.getBalance(lateClaimBeneficorAddress));
                await claimPreconfiguredBalance(claimersMid);
                let claimerBalanceMid = await hardhat_1.ethers.provider.getBalance(claimersMid.dmdv4Address);
                // claimer receive 75%.
                let expectedClaimerBalanceMid = BigInt(claimersMid.value) * BigInt(3) / BigInt(4);
                (0, chai_1.expect)(claimerBalanceMid).to.be.equal(expectedClaimerBalanceMid);
                // Fast forward time to after second dilution period.
                await helpers.time.increaseTo((await claimContract.dilute_s2_50_timestamp()) + BigInt(1));
                // another 25% of the funds got diluted.
                await claimContract.dilute2();
                // check the balances of the DAO and reinsert contracts.
                (0, chai_1.expect)(expectedDaoBalance2).to.be.equal(await hardhat_1.ethers.provider.getBalance(lateClaimBeneficorDAO));
                (0, chai_1.expect)(expectedReinsertPotBalance2).to.be.equal(await hardhat_1.ethers.provider.getBalance(lateClaimBeneficorAddress));
                await helpers.time.increaseTo((await claimContract.dilute_s3_0_timestamp()) + BigInt(1));
                await claimPreconfiguredBalance(claimersLate);
                // the remaining 50% of the funds get diluted.
                await claimContract.dilute3();
                // check the balances of the DAO and reinsert contracts.
                (0, chai_1.expect)(expectedDaoBalance3).to.be.equal(await hardhat_1.ethers.provider.getBalance(lateClaimBeneficorDAO));
                (0, chai_1.expect)(expectedReinsertPotBalance3).to.be.equal(await hardhat_1.ethers.provider.getBalance(lateClaimBeneficorAddress));
                // Try to dilute after all dilutions - should still fail, there most not be any reset.
                // NOTE: if someone sends coin to that contract, this funds will be lost.
                await (0, chai_1.expect)(claimContract.dilute1()).to.be.revertedWithCustomError(claimContract, "DiluteAllreadyHappened");
                await (0, chai_1.expect)(claimContract.dilute2()).to.be.revertedWithCustomError(claimContract, "DiluteAllreadyHappened");
                await (0, chai_1.expect)(claimContract.dilute3()).to.be.revertedWithCustomError(claimContract, "DiluteAllreadyHappened");
            });
        });
    });
});
