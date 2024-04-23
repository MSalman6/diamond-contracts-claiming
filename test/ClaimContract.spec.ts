import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import EC from "elliptic";
import BN from "bn.js";
import bitcoinMessage from "bitcoinjs-message";

import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

import { ClaimContract } from "../typechain-types";
import { DMDClaimingHelpers } from "../api/src/DMDClaimingHelpers";
import { ensure0x, hexToBuf, remove0x, stringToUTF8Hex, toHexString } from "../api/src/cryptoHelpers";
import { getTestSignatures } from "./fixtures/signature";
import { TestBalances, getTestBalances, getTestBalances_BTC, getTestBalances_DMD, getTestBalances_DMD_cli_same_address, getTestBalances_DMD_cli, getTestBalances_DMD_with_prefix } from "./fixtures/balances";
import { DMDClaimingAPI } from "../api/src/DMDClaimingAPI";


const ECPair = ECPairFactory(ecc);

function getDilluteTimestamps(): { dillute1: number, dillute2: number, dillute3: number } {
    let now = Math.floor(Date.now() / 1000);
    let dillute1 = now + (86400 * 2 * 31) + 86400 * 30;
    let dillute2 = now + (86400 * 3 * 31) + (86400 * 3 * 30);
    let dillute3 = now + (86400 * 4 * 365) + (86400 * 366);
    return { dillute1, dillute2, dillute3 };

}




describe('ClaimContract', () => {
    let signers: SignerWithAddress[];

    let lateClaimBeneficorAddress: string;
    let lateClaimBeneficorDAO: string;

    let cryptoJS: DMDClaimingHelpers;

    async function deployClaiming(claimBeneficorAddress: string, beneficorDAOAddress: string, prefix: string) {
        const contractFactory = await ethers.getContractFactory("ClaimContract");
        let dilluteTimestamps = getDilluteTimestamps();

        let prefixHex = stringToUTF8Hex(prefix);

        const claimContract = await contractFactory.deploy(claimBeneficorAddress, beneficorDAOAddress, prefixHex, dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3);

        await claimContract.waitForDeployment();

        return claimContract;
    }

    async function deployFixtureWithNoPrefix(): Promise<{ claimContract: ClaimContract }> {
        return deployFixture('');
    }

    async function deployFixture(prefixHex: string): Promise<{ claimContract: ClaimContract }> {
        const claimContractAny: any = await deployClaiming(lateClaimBeneficorAddress, lateClaimBeneficorDAO, prefixHex);
        const claimContract = claimContractAny as ClaimContract;
        return { claimContract }
    }

    async function verifySignature(claimContract: ClaimContract, claimToAddress: string, signatureBase64: string, dmdSignature: boolean, postfix: string = '') {
        const prefixBytes = await claimContract.prefixStr();
        const prefixBuffer = hexToBuf(prefixBytes);

        const prefixString = new TextDecoder("utf-8").decode(prefixBuffer);

        const key = cryptoJS.getPublicKeyFromSignature(signatureBase64, prefixString + claimToAddress + postfix, false);
        const rs = cryptoJS.signatureBase64ToRSV(signatureBase64);

        const txResult1 =
            await claimContract.claimMessageMatchesSignature(
                claimToAddress,
                true,
                stringToUTF8Hex(postfix),
                ensure0x(key.x),
                ensure0x(key.y),
                ensure0x('0x1b'),
                ensure0x(rs.r.toString('hex')),
                ensure0x(rs.s.toString('hex')),
                dmdSignature
            );

        const txResult2 =
            await claimContract.claimMessageMatchesSignature(
                claimToAddress,
                true,
                stringToUTF8Hex(postfix),
                ensure0x(key.x),
                ensure0x(key.y),
                ensure0x('0x1c'),
                ensure0x(rs.r.toString('hex')),
                ensure0x(rs.s.toString('hex')),
                dmdSignature
            );

        expect(txResult1 || txResult2).to.be.equal(true, "Claim message did not match the signature");
    }

    before(async () => {
        signers = await ethers.getSigners();

        lateClaimBeneficorAddress = signers[0].address;
        lateClaimBeneficorDAO = signers[1].address;

        cryptoJS = new DMDClaimingHelpers();
    });

    describe("deployment", () => {
        it('should revert deploy with beneficor address = 0x0', async () => {
            const contractFactory = await ethers.getContractFactory("ClaimContract");


            let dilluteTimestamps = getDilluteTimestamps();
            await expect(
                contractFactory.deploy(ethers.ZeroAddress, lateClaimBeneficorDAO, '0x', dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3)
            ).to.be.revertedWith("Beneficor Address Reinsert Pot must not be 0x0");
        });

        it('should revert deploy with beneficior DAO address = 0x0', async () => {
            const contractFactory = await ethers.getContractFactory("ClaimContract");
            let dilluteTimestamps = getDilluteTimestamps();
            await expect(
                contractFactory.deploy(lateClaimBeneficorAddress, ethers.ZeroAddress, '0x', dilluteTimestamps.dillute1, dilluteTimestamps.dillute2, dilluteTimestamps.dillute3)
            ).to.be.revertedWith("Beneficor Address DAO must not be 0x0");
        });

        it('should deploy contract', async () => {
            const contractFactory = await ethers.getContractFactory("ClaimContract");

            // get current timestamp:
            // dillute1 =  deploymentTimestamp + (1 days * 2 * 31) + 1 days * 30;
            // dillute2 =  deploymentTimestamp + (1 days * 3 * 31) + (1 days * 3 * 30);
            // dillute3 =  deploymentTimestamp + (YEAR_IN_SECONDS * 4) + LEAP_YEAR_IN_SECONDS;

            let dilluteTimestamps = getDilluteTimestamps();

            const contract = await contractFactory.deploy(
                lateClaimBeneficorAddress,
                lateClaimBeneficorDAO,
                '0x',
                dilluteTimestamps.dillute1,
                dilluteTimestamps.dillute2,
                dilluteTimestamps.dillute3
            );


            expect(await contract.waitForDeployment());
        });
    });

    describe("cryptographics", () => {
        it('should correctly calculate address checksum', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            const address = '0xfec7b00dc0192319dda0c777a9f04e47dc49bd18';
            const addressWithChecksum = '0xfEc7B00DC0192319DdA0c777A9F04E47Dc49bD18';

            const calcAddressResult = await claimContract.calculateAddressString(address, true);

            const buffer = Buffer.from(remove0x(calcAddressResult), 'hex');
            const calcResult = buffer.toString('utf8');

            expect(calcResult).to.be.equal(addressWithChecksum, 'checksum must be calculated in a correct ways.');
        });

        it('should create correct claim message', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            const address = '0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F';
            const resultJS = ensure0x(cryptoJS.getBitcoinSignedMessage(address).toString('hex'));

            const postfixHex = stringToUTF8Hex('');
            const result = await claimContract.createClaimMessage(address, true, postfixHex, false);

            expect(result).to.be.equal(resultJS);
        });


        it('should create correct claim message dmd with prefix', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            const prefix = '';
            const address = '0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F';
            const resultJS = ensure0x(cryptoJS.getDMDSignedMessage(prefix + address).toString('hex'));

            const postfixHex = stringToUTF8Hex('');
            const result = await claimContract.createClaimMessage(address, true, postfixHex, true);

            expect(result).to.be.equal(resultJS);
        });


        it('should convert pub key to eth address', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            // BIP39 Mnemonic: "hello slim hope" - really, i got this Mnemonic from RNG...
            // address 0: 0x7af37454aCaB6dB76c11bd33C94ED7C0b7A60B2a
            // Public:    0x03ff2e6a372d6beec3b02556971bfc87b9fb2d7e27fe99398c11693571080310d8
            // Private:   0xc99dd56045c449952e16388925455cc32e4eb180f2a9c3d2afd587aaf1cceda5

            const expectedAddress = '0x7af37454aCaB6dB76c11bd33C94ED7C0b7A60B2a';
            const inputPrivateKey = 'c99dd56045c449952e16388925455cc32e4eb180f2a9c3d2afd587aaf1cceda5';

            var ec = new EC.ec('secp256k1');
            var G = ec.g; // Generator point
            var pk = new BN(inputPrivateKey, 'hex'); // private key as big number
            var pubPoint = G.mul(pk); // EC multiplication to determine public point

            var x = pubPoint.getX().toBuffer(); //32 bit x co-ordinate of public point
            var y = pubPoint.getY().toBuffer(); //32 bit y co-ordinate of public point

            const result = await claimContract.pubKeyToEthAddress(x, y);

            expect(result).to.equal(expectedAddress);
        });

        it('should convert BTC address to RIPE result', async () => {
            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds

            const address = '1Q9G4T5rLaf4Rz39WpkwGVM7e2jMxD2yRj';

            const expectedRipeResult = 'FDDACAAF7D90A0D7FC90106C3A64ED6E3A2CF859'.toLowerCase();
            const realRipeResult = cryptoJS.dmdAddressToRipeResult(address).toString('hex');

            expect(realRipeResult).to.equal(expectedRipeResult);
        });

        it('should convert public key to to Bitcoin Address', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds
            const publicKeyHex = '035EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040';
            const expectedAddress = '1Q9G4T5rLaf4Rz39WpkwGVM7e2jMxD2yRj';

            const { x, y } = cryptoJS.getXYfromPublicKeyHex(publicKeyHex);



            const essentialPart = await claimContract.publicKeyToBitcoinAddress(
                ensure0x(x.toString('hex')),
                ensure0x(y.toString('hex')),
                1
            );

            const bs58Result = cryptoJS.bitcoinAddressEssentialToFullQualifiedAddress(
                essentialPart,
                '00'
            );

            expect(bs58Result).to.equal(expectedAddress);

            console.log();
            // we are also cross checking the result with the result from the cryptoJS library,
            // (that uses bitcoin payments internaly to verify)
            const addressFromCryptJS = cryptoJS.publicKeyToBitcoinAddress(publicKeyHex);
            expect(bs58Result).to.equal(addressFromCryptJS);
        });

        it('correct hash for claim message', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            const message = '0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F';
            const hash = ensure0x(bitcoinMessage.magicHash(message).toString('hex'));

            const hashFromSolidity = await claimContract.getHashForClaimMessage(message, true, "0x", false);
            expect(hash).to.be.equal(hashFromSolidity);
        });

        it('should recover public key from signature', async () => {
            //https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            //passphrase: bit.diamonds

            const message = "0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F";
            const signatureBase64 = "IBHr8AT4TZrOQSohdQhZEJmv65ZYiPzHhkOxNaOpl1wKM/2FWpraeT8L9TaphHI1zt5bI3pkqxdWGcUoUw0/lTo=";
            const key = cryptoJS.getPublicKeyFromSignature(signatureBase64, message, false);

            expect(key.x).equal("0x5EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
            expect(key.y).equal("0x99523EB43291A1067FA819AA5A74F30810B19D15F6EDC19C9D8AA525B0F6C683".toLowerCase());
            expect(key.publicKey).equal("0x035EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
        });

        it('should recover public key from signatures, test signatures set.', async () => {
            // Same test as previous
            // But with multi signatures of the same key.
            // in order to cover different signatures variations,
            // like short S and short R

            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds

            // signatures created with: https://reinproject.org/bitcoin-signature-tool/#sign

            const message = "0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F";
            const signaturesBase64 = getTestSignatures();

            for (let index = 0; index < signaturesBase64.length; index++) {
                const signatureBase64 = signaturesBase64[index];
                const key = cryptoJS.getPublicKeyFromSignature(signatureBase64, message, false);

                expect(key.x).equal("0x5EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
                expect(key.y).equal("0x99523EB43291A1067FA819AA5A74F30810B19D15F6EDC19C9D8AA525B0F6C683".toLowerCase());
                expect(key.publicKey).equal("0x035EF44A6382FABDCB62425D68A0C61998881A1417B9ED068513310DBAE8C61040".toLowerCase());
            }
        });

        it('should match recovered address with expected Etherem/Bitcoin pseudo address', async () => {
            const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

            // same test as previous
            // But with multi signatures of the same key.
            // in order to cover different signatures variations,
            // like short S and short R

            // with this tool, we can create a Bitcoin address from a passphrase,
            // also knowing X and Y.

            // https://royalforkblog.github.io/2014/08/11/graphical-address-generator/
            // passphrase: bit.diamonds

            // and with this tool we can create the equivalent Ethereum Address,
            // with the same X and Y then the Bitcoin ist.

            // https://www.royalfork.org/2017/12/10/eth-graphical-address/
            // passphrase: bit.diamonds

            const expectedEthAddress = '0xA5956975DE8711DFcc82DE5f8F5d151c41556656';
            const message = "0x70A830C7EffF19c9Dd81Db87107f5Ea5804cbb3F";

            // there for we can make a EC Recover on a bitcoin signed message and
            // compare it with the Ethereum Signed Message

            const signaturesBase64 = getTestSignatures();

            for (let index = 0; index < signaturesBase64.length; index++) {
                const signatureBase64 = getTestSignatures()[0];
                const rs = cryptoJS.signatureBase64ToRSV(signatureBase64);

                const recoveredETHAddress = await claimContract.getEthAddressFromSignature(
                    message,
                    true,
                    stringToUTF8Hex(''),
                    '0x1b',
                    ensure0x(rs.r),
                    ensure0x(rs.s),
                    false
                );
                const recoveredETHAddress2 = await claimContract.getEthAddressFromSignature(
                    message,
                    true,
                    stringToUTF8Hex(''),
                    '0x1c',
                    ensure0x(rs.r),
                    ensure0x(rs.s),
                    false
                );

                expect(expectedEthAddress).to.be.oneOf([recoveredETHAddress, recoveredETHAddress2]);
            }
        });




        async function runAddAndClaimTests(testSet: TestBalances) {

            let deployFixtureSpecified = () => {
                return deployFixture(testSet.messagePrefix);
            };

            const { claimContract } = await helpers.loadFixture(deployFixtureSpecified);
            const caller = signers[0];
            const balances = testSet;

            let cryptoSol = new DMDClaimingAPI(claimContract);

            for (const balance of balances.balances) {
                const ripeAddress = ensure0x(cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address));
                // cryptoSol.addBalance(balance.dmdv3Address, balance.value);
                await claimContract.connect(caller).addBalance(ripeAddress, { value: balance.value });
                const currentBalance = await claimContract.balances(ripeAddress);
                expect(currentBalance).to.equal(balance.value, 'Balance of DMDv3 adress matches defined Balance.');
            }

            for (const balance of balances.balances) {
                let balanceBeforeClaim = await ethers.provider.getBalance(balance.dmdv4Address);
                await cryptoSol.claim(balance.dmdv4Address, balance.signature, "", balances.isDMDSigned);
                let balanceAfterClaim = await ethers.provider.getBalance(balance.dmdv4Address);

                let expectedBalance = ethers.toBigInt(balance.value) + balanceBeforeClaim;
                expect(balanceAfterClaim).to.equal(expectedBalance, 'Balance of DMDv4 adress matches defined Balance.');
            }
        }

        describe("cryptographics with defined message prefix", async function () {
            const claimToString = stringToUTF8Hex('claim to ');

            async function deployWithPrefixFixture(): Promise<{ claimContract: ClaimContract }> {
                const claimContractUntyped: any = await deployClaiming(
                    lateClaimBeneficorAddress,
                    lateClaimBeneficorDAO,
                    claimToString
                );

                const claimContract = claimContractUntyped as ClaimContract;
                return { claimContract };
            }

            it('should validate signature with defined prefix', async () => {
                const { claimContract } = await helpers.loadFixture(deployWithPrefixFixture);

                const claimToAddress = "0x9edD67cCFd52211d769A7A09b989d148749B1d10";
                const signatureBase64 = "IDuuajA4vgGuu77fdoE0tntWP5TMGPLDO2VduTqE6wPKR2+fnF+JFD3LErn8vtqk81fL3qfjJChcrUnG5eTv/tQ=";

                await verifySignature(claimContract, claimToAddress, signatureBase64, false);
            });

            it('should validate signature defined prefix and postfix', async () => {
                const { claimContract } = await helpers.loadFixture(deployWithPrefixFixture);

                const claimToAddress = "0x9edD67cCFd52211d769A7A09b989d148749B1d10";
                const signatureBase64 = "IIQYAZ+4Tf7bdw9UX72adTvH80vz2igEABRnwElSy1ZvZGICcqX8bYw6e9LZ+QPrKW4VIJrA9cZJhR3cSCt8BAc=";

                const suffixString = ' test suffix 123';

                await verifySignature(claimContract, claimToAddress, signatureBase64, false, suffixString);
            });
        });

        describe("balance", async function () {

            it('should correctly add balances', async () => {
                const { claimContract } = await helpers.loadFixture(deployFixtureWithNoPrefix);

                const claimContractAddress = await claimContract.getAddress();
                const caller = signers[0];
                const balances = getTestBalances();

                let expectedTotalBalance = ethers.toBigInt('0');

                for (const balance of balances) {

                    const ripeAddress = ensure0x(cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address));
                    await claimContract.connect(caller).addBalance(ripeAddress, { value: balance.value });
                    expectedTotalBalance = expectedTotalBalance + ethers.toBigInt(balance.value);
                    const currentBalance = await claimContract.balances(ripeAddress);
                    expect(currentBalance).to.equal(balance.value, 'Balance of DMDv3 adress matches defined Balance.');
                }

                const totalBalance = await ethers.provider.getBalance(claimContractAddress);
                expect(totalBalance).to.equal(expectedTotalBalance, 'Balance of contract should be the total of all added funds.');
            });

            it('fill() a balance testset', async () => {
                let deployFreshFixtureForBalanceTest = () => deployFixtureWithNoPrefix();
                const { claimContract } = await helpers.loadFixture(deployFreshFixtureForBalanceTest);

                const caller = signers[0];
                const testbalances = getTestBalances();

                let expectedTotalBalance = ethers.toBigInt('0');

                let accounts: string[] = [];
                let balances: string[] = [];

                for (const balance of testbalances) {
                    accounts.push(ensure0x(cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address)));
                    balances.push(balance.value);
                    expectedTotalBalance = expectedTotalBalance + ethers.toBigInt(balance.value);
                }

                await claimContract.connect(caller).fill(accounts, balances, { value: expectedTotalBalance });

                const totalBalance = await ethers.provider.getBalance(await claimContract.getAddress());
                expect(totalBalance).to.equal(expectedTotalBalance, 'Balance of contract should be the total of all added funds.');


                for (const balance of testbalances) {
                    const currentBalance = await claimContract.balances(cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address));
                    expect(currentBalance.toString()).to.equal(balance.value, 'Balance of DMDv3 adress matches defined Balance.');
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

                let testset = getTestBalances_DMD_cli_same_address();
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
                    } else {
                        expect(x).to.equal(key.x, "Public key is not the same for all signatures.");
                        expect(y).to.equal(key.y, "Public key is not the same for all signatures.");
                    }



                   // const essentialPart = await claimContract.publicKeyToBitcoinAddress(x, y, 1);
                   // const bs58Result = cryptoJS.bitcoinAddressEssentialToFullQualifiedAddress(
                   //     essentialPart,
                   //     '24'
                   // );

                   // console.log(balance.dmdv3Address);
                   // console.log(bs58Result);

                    //console.log(cryptoJS.publicKeyToBitcoinAddress(key.publicKey));
                }
            });

            it("rejecting double add balances for defined DMD address", async () => {
                await expect(runAddAndClaimTests(getTestBalances_DMD_cli_same_address())).to.rejectedWith("There is already a balance defined for this old address");
            });

            it("DMD address building from ripe.", async () => {
                let balances = getTestBalances();

                for (let balance of balances) {
                    const ripeResult = cryptoJS.dmdAddressToRipeResult(balance.dmdv3Address);
                    const dmdAddressFromRipe = cryptoJS.ripeToDMDAddress(ripeResult);
                    expect(dmdAddressFromRipe).to.equal(balance.dmdv3Address);
                }
            });
        });


        describe("claiming", async function () {

            it("claiming BTC", async () => {
                await runAddAndClaimTests(getTestBalances_BTC());
            });

            // DMD claiming is known to fail.
            it("claiming DMD", async () => {
                await runAddAndClaimTests(getTestBalances_DMD_cli());
            });

            it("claiming DMD with prefix", async () => {
                await runAddAndClaimTests(getTestBalances_DMD_with_prefix());
            });
        });
    });

});