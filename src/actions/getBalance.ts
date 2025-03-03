import {
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    Action,
    composeContext,
    ModelClass,
    generateObjectDeprecated,
    Content,
    ActionExample,
} from "@elizaos/core";
import { ethers } from "ethers";

export interface BalanceContent extends Content {
    address: string;
}

function isBalanceContent(
    _runtime: IAgentRuntime,
    content: unknown
): content is BalanceContent {
    return typeof (content as BalanceContent).address === "string";
}

const balanceTemplate = `
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

export const getBalance: Action = {
    name: "GET_BALANCE",
    description: "Get the balance of a specific address",
    similes: ["GET_BALANCE", "CHECK_BALANCE", "CHECK_BALANCE_OF", "CHECK_BALANCE_OF_ADDRESS", "LOOKUP_BALANCE", "LOOKUP_BALANCE_OF", "LOOKUP_BALANCE_OF_ADDRESS", "LIST_BALANCE", "LIST_BALANCE_OF", "LIST_BALANCE_OF_ADDRESS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Validating get balance action");
        return true;
    },
    handler: async (
        runtime: IAgentRuntime, 
        message: Memory, 
        state: State, 
        _options: { [key: string]: unknown }, 
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("Getting balance");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const balanceContext = composeContext({
            state,
            template: balanceTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: balanceContext,
            modelClass: ModelClass.LARGE,
        });

        elizaLogger.info("Balance content:", content);

        if (!isBalanceContent(runtime, content)) {
            elizaLogger.error("Invalid content for GET_BALANCE action.");
            if (callback) {
                callback({
                    text: "Unable to process balance request. Invalid content provided.",
                    content: { error: "Invalid balance content" },
                });
            }
            return false;
        }

        try {
            const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
            const walletAddress = content.address;
            const balance = await provider.getBalance(walletAddress);
            const balanceInSonic = ethers.formatEther(balance);

            if (callback) {
                callback({
                    text: `Balance: ${balanceInSonic} S`,
                    content: { balance: balanceInSonic },
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error getting balance", error);
            if (callback) {
                callback({
                    text: `Error getting balance: ${error}`,
                    content: { error: error },
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
                    text: "Check my balance of SONIC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance of SONIC",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my balance of token 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance of token 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                        token: "0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get SONIC balance of 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check SONIC balance of 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    action: "GET_BALANCE",
                    content: {
                        address: "0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my wallet balance on SONIC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your wallet balance on SONIC",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is my balance?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            }
        ]
    ] as ActionExample[][],
} as Action;