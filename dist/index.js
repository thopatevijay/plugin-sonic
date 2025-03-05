// src/actions/transferToken/transferToken.ts
import {
  elizaLogger,
  ModelClass
} from "@elizaos/core";
import { composeContext, generateObjectDeprecated } from "@elizaos/core";
import { ethers } from "ethers";

// src/constant.ts
var DEFAULT_SONIC_RPC_URL = "https://rpc.blaze.soniclabs.com";
var CHAIN_RPC_URLS = {
  MAINNET: "https://rpc.soniclabs.com",
  TESTNET: "https://rpc.blaze.soniclabs.com"
};
var TRANSFER_TEMPLATE = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
\`\`\`json
{
    "recipient": "0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
    "amount": "1.5",
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token transfer:
- Recipient address (Sonic wallet address)
- Amount to transfer
- Token contract address (null for native SONIC transfers, Sonic native token is "S")

Respond with a JSON markdown block containing only the extracted values.`;
var GET_BALANCE_TEMPLATE = `
Given the recent messages and wallet information below:

Example response:
\`\`\`json
{
    "address": "B62qkGSBuLmqYApYoWTmAzUtwFVx6Fe9ZStJVPzCwLjWZ5NQDYTiqEU",
    "balance": "100" // balance in SONIC
}
\`\`\`

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested Balance request:
- Address to check balance for.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
`;

// src/actions/transferToken/transferToken.ts
async function transferSimpleToken(runtime, recipient, amount) {
  const sonicRPCUrl = runtime.getSetting("SONIC_RPC_URL") || DEFAULT_SONIC_RPC_URL;
  const walletPrivateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
  const provider = new ethers.JsonRpcProvider(sonicRPCUrl);
  const wallet = new ethers.Wallet(walletPrivateKey, provider);
  const recipientAddress = recipient;
  const amountToTransfer = ethers.parseEther(amount);
  try {
    const txn = {
      to: recipientAddress,
      value: amountToTransfer,
      gasLimit: 21e3
    };
    const tx = await wallet.sendTransaction(txn);
    elizaLogger.info("Transaction sent:", tx);
    const receipt = await tx.wait();
    elizaLogger.info("Transaction successful:", receipt);
    return receipt?.hash ?? "";
  } catch (error) {
    elizaLogger.error("Error transferring token", error);
    throw error;
  }
}
function isTransferContent(_runtime, content) {
  return typeof content.recipient === "string" && (typeof content.amount === "string" || typeof content.amount === "number");
}
var transferToken = {
  name: "TRANSFER_TOKEN",
  description: "Transfer SONIC token to a specific address",
  similes: ["TRANSFER_TOKENS", "SEND_TOKENS", "SEND_TOKEN", "SEND_TOKENS_TO_ADDRESS"],
  validate: async (runtime, message) => {
    elizaLogger.info("Validating transfer token action");
    const walletPrivateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
    if (!walletPrivateKey) {
      elizaLogger.error("Missing SONIC_WALLET_PRIVATE_KEY");
      return false;
    }
    return true;
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.info("Transferring token");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const transferContext = composeContext({
      state,
      template: TRANSFER_TEMPLATE
    });
    const content = await generateObjectDeprecated({
      runtime,
      context: transferContext,
      modelClass: ModelClass.LARGE
    });
    if (!isTransferContent(runtime, content)) {
      elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
      if (callback) {
        callback({
          text: "Unable to process transfer request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const txnHash = await transferSimpleToken(
        runtime,
        content.recipient,
        content.amount.toString()
      );
      if (!txnHash) {
        elizaLogger.error("Error transferring token");
        if (callback) {
          callback({
            success: false,
            text: `Error transferring token`,
            content: { error: "Error transferring token" }
          });
        }
        return false;
      }
      if (callback) {
        callback({
          text: `Successfully transferred ${content.amount} to ${content.recipient} 
Transaction: ${txnHash}`,
          content: {
            success: true,
            signature: txnHash,
            amount: content.amount,
            recipient: content.recipient
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error transferring token", error);
      if (callback) {
        callback({
          text: `Error transferring token: ${error}`,
          content: { error }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer 0.1 S token to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
          action: "TRANSFER_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I want to transfer 1 SONIC token to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
          action: "TRANSFER_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully sent 0.1 S token to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
        }
      }
    ]
  ]
};

// src/actions/getBalance.ts
import {
  elizaLogger as elizaLogger2,
  composeContext as composeContext2,
  ModelClass as ModelClass2,
  generateObjectDeprecated as generateObjectDeprecated2
} from "@elizaos/core";
import { ethers as ethers2 } from "ethers";
function isBalanceContent(_runtime, content) {
  return typeof content.address === "string";
}
var getBalance = {
  name: "GET_BALANCE",
  description: "Get the balance of a specific address on the Sonic blockchain",
  similes: [
    "GET_BALANCE",
    "CHECK_BALANCE",
    "CHECK_BALANCE_OF",
    "CHECK_BALANCE_OF_ADDRESS",
    "LOOKUP_BALANCE",
    "LOOKUP_BALANCE_OF",
    "LOOKUP_BALANCE_OF_ADDRESS",
    "LIST_BALANCE",
    "LIST_BALANCE_OF",
    "LIST_BALANCE_OF_ADDRESS",
    "GET_BALANCE_OF",
    "GET_BALANCE_OF_ADDRESS",
    "GET_BALANCE_OF_WALLET",
    "GET_BALANCE_OF_WALLET_ADDRESS"
  ],
  validate: async (runtime, message) => {
    elizaLogger2.info("Validating get balance action");
    return true;
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.info("Getting balance");
    let currentState;
    if (!state) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(state);
    }
    const balanceContext = composeContext2({
      state: currentState,
      template: GET_BALANCE_TEMPLATE
    });
    const content = await generateObjectDeprecated2({
      runtime,
      context: balanceContext,
      modelClass: ModelClass2.LARGE
    });
    if (!isBalanceContent(runtime, content) || !content.address || content.address === "{{walletAddress}}") {
      elizaLogger2.error("No wallet address provided for GET_BALANCE action.");
      if (callback) {
        callback({
          text: "I need a wallet address to check the balance. Please provide a wallet address.",
          content: { error: "Missing wallet address" }
        });
      }
      return false;
    }
    const sonicRPCUrl = runtime.getSetting("SONIC_RPC_URL") || DEFAULT_SONIC_RPC_URL;
    try {
      const provider = new ethers2.JsonRpcProvider(sonicRPCUrl);
      const walletAddress = content.address;
      const balance = await provider.getBalance(walletAddress);
      const balanceInSonic = ethers2.formatEther(balance);
      if (callback) {
        callback({
          text: `Balance: ${balanceInSonic} S`,
          content: { balance: balanceInSonic }
        });
      }
      return true;
    } catch (error) {
      elizaLogger2.error("Error getting balance", error);
      if (callback) {
        callback({
          text: `Error getting balance: ${error}`,
          content: { error }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my balance of SONIC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check your balance of SONIC",
          action: "GET_BALANCE",
          content: {
            address: "{{walletAddress}}"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my balance of token 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check your balance of token 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
          action: "GET_BALANCE",
          content: {
            address: "{{walletAddress}}",
            token: "0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get SONIC balance of 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check SONIC balance of 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
          action: "GET_BALANCE",
          content: {
            address: "0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my wallet balance on SONIC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check your wallet balance on SONIC",
          action: "GET_BALANCE",
          content: {
            address: "{{walletAddress}}"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What is my balance?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I need a wallet address to check the balance. Please provide a wallet address.",
          content: { error: "Missing wallet address" }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What is my balance?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I need a wallet address to check the balance. Please provide a wallet address.",
          content: { error: "Missing wallet address" }
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "My wallet address is 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check the balance for 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
          action: "GET_BALANCE",
          content: {
            address: "0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check balance"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I need a wallet address to check the balance. Please provide a wallet address.",
          content: { error: "Missing wallet address" }
        }
      }
    ]
  ]
};

// src/providers/sonicWallet.ts
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
var SonicWalletManager = class {
  constructor(privateKey, chain) {
    try {
      const hexPrivateKey = this.addHexPrefix(privateKey);
      this.account = privateKeyToAccount(hexPrivateKey);
      const transport = http(chain.rpcUrls.default.http[0]);
      this.publicClient = createPublicClient({
        chain,
        transport
      });
      this.walletClient = createWalletClient({
        account: this.account,
        chain,
        transport
      });
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  addHexPrefix(privateKey) {
    return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  }
  getAddress() {
    return this.account.address;
  }
  async getBalance() {
    try {
      const balance = await this.publicClient.getBalance({
        address: this.account.address
      });
      return formatEther(balance);
    } catch (error) {
      throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  getWalletClient() {
    return this.walletClient;
  }
};
function resolveChainFromRPCUrl(rpcUrl) {
  switch (rpcUrl) {
    case CHAIN_RPC_URLS.MAINNET:
      return viemChains.sonic;
    case CHAIN_RPC_URLS.TESTNET:
      return viemChains.sonicBlazeTestnet;
    default:
      throw new Error(`Unsupported RPC URL: ${rpcUrl}, we only support ${Object.values(CHAIN_RPC_URLS).join(", ")}`);
  }
}
function initializeSonicWallet(runtime) {
  const privateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("SONIC_WALLET_PRIVATE_KEY is not configured");
  }
  const rpcUrl = runtime.getSetting("SONIC_RPC_URL") ?? CHAIN_RPC_URLS.MAINNET;
  const chain = resolveChainFromRPCUrl(rpcUrl);
  return new SonicWalletManager(privateKey, chain);
}
var sonicWalletProvider = {
  async get(runtime, _message, _state) {
    try {
      const wallet = initializeSonicWallet(runtime);
      const [address, balance] = await Promise.all([
        wallet.getAddress(),
        wallet.getBalance()
      ]);
      const rpcUrl = runtime.getSetting("SONIC_RPC_URL");
      const network = rpcUrl === CHAIN_RPC_URLS.MAINNET ? "Mainnet" : "Testnet";
      elizaLogger3.info("\u{1F4F1} Sonic Wallet Status :", {
        address,
        balance,
        network
      });
      return [
        `\u{1F4F1} Sonic Wallet Status:`,
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
        `\u{1F511} Address: ${address}`,
        `\u{1F4B0} Balance: ${balance} S`,
        `\u{1F310} Network: ${network}`,
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`
      ].join("\n");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      elizaLogger3.error("Sonic Wallet Operation Failed:", {
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return [
        `\u274C Sonic Wallet Error:`,
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
        `Unable to access wallet information.`,
        `Error: ${errorMessage}`,
        `Please check your wallet configuration and try again.`,
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`
      ].join("\n");
    }
  }
};

// src/index.ts
var sonicPlugin = {
  name: "sonic",
  description: "Sonic blockchain plugin for ElizaOS",
  actions: [
    transferToken,
    getBalance
  ],
  clients: [],
  adapters: [],
  providers: [sonicWalletProvider]
};
var index_default = sonicPlugin;
export {
  index_default as default,
  sonicPlugin
};
//# sourceMappingURL=index.js.map