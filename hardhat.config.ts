import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import * as fs from "fs";


let mnemonic = 'inspire school random normal account steel strike shove close album produce cube bounce memory before';
if (fs.existsSync(".mnemonic")) {
  mnemonic = fs.readFileSync(".mnemonic").toString().trim();
}

const config: HardhatUserConfig = {
  defaultNetwork: "alpha2",
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
    alpha2: {
      url: "https://rpc.uniq.diamonds",
      accounts: {
        count: 100,
        mnemonic
      },
      allowUnlimitedContractSize: true,
      hardfork: "istanbul",
      minGasPrice: 1000000000
    },
  },
  solidity: {
    version: "0.8.20",
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
            chainId: 777012,
            urls: {
                apiURL: "http://127.0.0.1:4000/api",
                browserURL: "http://127.0.0.1:4000",
            },
        },
        {
            network: "alpha2",
            chainId: 777012,
            urls: {
                apiURL: "https://explorer.uniq.diamonds/api",
                browserURL: "http://explorer.uniq.diamonds",
            },
        },
    ],
},
};

export default config;
