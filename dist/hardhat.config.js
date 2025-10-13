"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
const fs_1 = __importDefault(require("fs"));
let mnemonic = 'inspire school random normal account steel strike shove close album produce cube bounce memory before';
if (fs_1.default.existsSync(".mnemonic")) {
    mnemonic = fs_1.default.readFileSync(".mnemonic").toString().trim();
    console.log("did read mnemonic from FS");
}
const config = {
    defaultNetwork: "mainnet",
    networks: {
        hardhat: {
            accounts: {
                count: 100,
                mnemonic,
                accountsBalance: "1000000000000000000000000000"
            },
            allowUnlimitedContractSize: true,
            hardfork: "istanbul",
            minGasPrice: 0,
            blockGasLimit: 1199511627775
        },
        local: {
            url: "http://127.0.0.1:8540",
            accounts: {
                count: 100,
                mnemonic
            },
            allowUnlimitedContractSize: true,
            hardfork: "istanbul",
            minGasPrice: 1000000000
        },
        beta1: {
            url: "http://62.171.133.46:47272",
            accounts: {
                count: 10,
                path: "m/44'/60'/0'/0",
                mnemonic
            },
            allowUnlimitedContractSize: true,
            hardfork: "london",
            minGasPrice: 1000000000
        },
        testnet: {
            url: "http://62.171.133.46:20100",
            accounts: {
                count: 10,
                path: "m/44'/60'/0'/0",
                mnemonic
            },
            allowUnlimitedContractSize: true,
            hardfork: "london",
            minGasPrice: 1000000000
        },
        mainnet: {
            url: "http://173.249.48.139:10000",
            accounts: {
                count: 10,
                path: "m/44'/60'/0'/0",
                mnemonic
            },
            allowUnlimitedContractSize: true,
            hardfork: "london",
            minGasPrice: 1000000000
        },
    },
    solidity: {
        version: "0.8.26",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
                details: {
                    yul: true,
                },
            },
            evmVersion: "istanbul"
        },
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./test",
    },
    typechain: {
        target: "ethers-v6",
    },
    etherscan: {
        apiKey: "123",
        customChains: [
            {
                network: "local",
                chainId: 777000,
                urls: {
                    apiURL: "http://127.0.0.1:4000/api",
                    browserURL: "http://127.0.0.1:4000",
                },
            },
            {
                network: "alpha3",
                chainId: 777017,
                urls: {
                    apiURL: "http://62.171.133.46:4000/api",
                    browserURL: "http://62.171.133.46:4000",
                },
            },
            {
                network: "testnet",
                chainId: 37373,
                urls: {
                    apiURL: "http://62.171.133.46:4000/api",
                    browserURL: "http://62.171.133.46:4000",
                },
            },
        ],
    },
    mocha: {
        timeout: 60000,
    },
};
exports.default = config;
