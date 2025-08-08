require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const BSC_MAINNET_RPC_URL = process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      chainId: 31337
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 97,
      gasPrice: 20000000000
    },
    bsc: {
      url: BSC_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 56,
      gasPrice: 5000000000
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: BSCSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY
    }
  },
  paths: {
    sources: "./src/contracts/solidity",
    tests: "./src/contracts/test",
    cache: "./src/contracts/cache",
    artifacts: "./src/contracts/artifacts"
  },
  mocha: {
    timeout: 40000
  }
};