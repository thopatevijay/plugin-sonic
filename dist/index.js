// src/actions/transferToken/transferToken.ts
import {
  elizaLogger as elizaLogger2,
  ModelClass
} from "@elizaos/core";
import { composeContext, generateObjectDeprecated } from "@elizaos/core";

// src/constant.ts
var CHAIN_RPC_URLS = {
  MAINNET: "https://rpc.soniclabs.com",
  TESTNET: "https://rpc.blaze.soniclabs.com"
};
var TRANSFER_TEMPLATE = `You are an AI assistant specialized in processing cryptocurrency transfer requests. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested transfer:
1. Amount to transfer (in S, without the coin symbol)
2. Recipient address (must be a valid Ethereum address)
3. Token symbol or address (if not a native token transfer)

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information from the user's message:
   - Quote the part mentioning the amount.
   - Quote the part mentioning the recipient address.
   - Quote the part mentioning the token (if any).
   
2. Validate each piece of information:
   - Amount: Attempt to convert the amount to a number to verify it's valid.
   - Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - Token: Note whether it's a native transfer or if a specific token is mentioned.

3. If any information is missing or invalid, prepare an appropriate error message.

4. If all information is valid, summarize your findings.

5. Prepare the JSON structure based on your analysis.

After your analysis, provide the final output in a JSON markdown block. All fields except 'token' are required. The JSON should have this structure:

\`\`\`json
{
    "fromChain": string,
    "amount": string,
    "toAddress": string,
    "token": string | null
}
\`\`\`

Remember:
- The amount should be a string representing the number without any currency symbol.
- The recipient address must be a valid Ethereum address starting with "0x".
- If no specific token is mentioned (i.e., it's a native token transfer), set the "token" field to null.

Now, process the user's request and provide your response.
`;

// src/providers/sonicWallet.ts
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import { elizaLogger } from "@elizaos/core";
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
  getNetwork() {
    return this.publicClient.chain?.name ?? "Unknown Network";
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
  try {
    const privateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
    if (!privateKey) {
      elizaLogger.error("Sonic Wallet initialization failed: SONIC_WALLET_PRIVATE_KEY is not configured");
      return null;
    }
    const rpcUrl = runtime.getSetting("SONIC_RPC_URL") ?? CHAIN_RPC_URLS.MAINNET;
    const chain = resolveChainFromRPCUrl(rpcUrl);
    return new SonicWalletManager(privateKey, chain);
  } catch (error) {
    elizaLogger.error("Sonic Wallet initialization failed:", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return null;
  }
}
var sonicWalletProvider = {
  async get(runtime, _message, _state) {
    const wallet = initializeSonicWallet(runtime);
    if (!wallet) {
      return [
        `\u274C Sonic Wallet Error:`,
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
        `Unable to initialize wallet.`,
        `Please check your wallet configuration:`,
        `- Ensure SONIC_WALLET_PRIVATE_KEY is configured`,
        `- Verify the private key format is correct`,
        `- Check RPC URL configuration`,
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`
      ].join("\n");
    }
    try {
      const [address, balance] = await Promise.all([
        wallet.getAddress(),
        wallet.getBalance()
      ]);
      const rpcUrl = runtime.getSetting("SONIC_RPC_URL");
      const network = rpcUrl === CHAIN_RPC_URLS.MAINNET ? "Mainnet" : "Testnet";
      elizaLogger.info("\u{1F4F1} Sonic Wallet Status :", {
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
      elizaLogger.error("Sonic Wallet Operation Failed:", {
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

// src/actions/transferToken/transferToken.ts
import { formatEther as formatEther2, parseEther } from "viem";
var TransferError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "TransferError";
  }
};
var TransferAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async transfer(params) {
    const walletClient = this.wallet.getWalletClient();
    if (!walletClient.account) {
      throw new TransferError("Wallet account not found");
    }
    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: params.toAddress,
        value: parseEther(params.amount),
        data: params.data ?? "0x",
        chain: walletClient.chain
      });
      elizaLogger2.debug("Transaction submitted", { hash });
      return {
        hash,
        from: walletClient.account.address,
        to: params.toAddress,
        amount: parseEther(params.amount),
        data: params.data ?? "0x",
        explorerTxnUrl: `${walletClient.chain?.blockExplorers?.default?.url}/tx/${hash}`
      };
    } catch (error) {
      elizaLogger2.error("Transaction failed", { error, params });
      throw new TransferError("Failed to transfer tokens", error);
    }
  }
};
var buildTransferDetails = async (state, runtime) => {
  const transferContext = composeContext({
    state,
    template: TRANSFER_TEMPLATE
  });
  const transferDetails = await generateObjectDeprecated({
    runtime,
    context: transferContext,
    modelClass: ModelClass.LARGE
  });
  if (!isTransferContent(runtime, transferDetails)) {
    throw new Error("Invalid content for TRANSFER_TOKEN action.");
  }
  return transferDetails;
};
function isTransferContent(_runtime, content) {
  return typeof content.toAddress === "string" && (typeof content.amount === "string" || typeof content.amount === "number");
}
var transferToken = {
  name: "TRANSFER_TOKEN",
  description: "Transfer SONIC token to a specific address",
  similes: ["TRANSFER_TOKENS", "SEND_TOKENS", "SEND_TOKEN", "SEND_TOKENS_TO_ADDRESS"],
  validate: async (runtime, _message) => {
    const walletPrivateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
    if (!walletPrivateKey) {
      elizaLogger2.error("Validation failed: Missing SONIC_WALLET_PRIVATE_KEY");
      return false;
    }
    return true;
  },
  suppressInitialMessage: true,
  handler: async (runtime, message, state, _options, callback) => {
    try {
      const currentState = state ?? await runtime.composeState(message);
      const updatedState = await runtime.updateRecentMessageState(currentState);
      const sonicWallet = initializeSonicWallet(runtime);
      if (!sonicWallet) {
        throw new Error("Sonic Wallet initialization failed");
      }
      const action = new TransferAction(sonicWallet);
      const transferDetails = await buildTransferDetails(updatedState, runtime);
      const transferResp = await action.transfer(transferDetails);
      if (callback) {
        const formattedAmount = formatEther2(transferResp.amount);
        callback({
          text: [
            "\u{1F3AF} Transaction Receipt",
            "------------------------",
            "\u2705 Status: Success",
            `Amount: ${formattedAmount} S`,
            `To: ${transferResp.to}`,
            `From: ${transferResp.from}`,
            `Transaction Hash: ${transferResp.hash}`,
            "------------------------"
          ].join("\n"),
          content: {
            success: true,
            signature: transferResp.hash,
            amount: formattedAmount,
            recipient: transferResp.to,
            explorerTxnUrl: transferResp.explorerTxnUrl
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger2.error("Handler failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Transaction failed: ${errorMessage}`,
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
        user: "assistant",
        content: {
          text: "I'll help you transfer 1 ETH to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
          action: "TRANSFER_TOKEN"
        }
      }
    ]
  ]
};

// src/actions/getBalance.ts
import {
  elizaLogger as elizaLogger3
} from "@elizaos/core";
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
    elizaLogger3.info("Validating get balance action");
    try {
      const sonicWallet = initializeSonicWallet(runtime);
      if (!sonicWallet) {
        elizaLogger3.error("Failed to initialize Sonic wallet");
        return false;
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error validating get balance action", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger3.info("Getting balance");
    let currentState;
    if (!state) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(state);
    }
    try {
      const sonicWallet = initializeSonicWallet(runtime);
      if (!sonicWallet) {
        elizaLogger3.error("Failed to initialize Sonic wallet");
        if (callback) {
          callback({
            text: "Failed to initialize Sonic wallet",
            content: { error: "Failed to initialize Sonic wallet" }
          });
        }
        return false;
      }
      const balance = await sonicWallet.getBalance();
      const constructResponse = `
            Address: ${sonicWallet.getAddress()}
            Balance: ${balance} S
            Network: ${sonicWallet.getNetwork()}
            `;
      if (callback) {
        callback({
          text: constructResponse
        });
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error getting balance", error);
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
          action: "GET_BALANCE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show my balance"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check SONIC balance...",
          action: "GET_BALANCE"
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
          action: "GET_BALANCE"
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
          text: "I'll help you check your balance..."
        }
      }
    ]
  ]
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