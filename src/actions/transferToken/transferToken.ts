import {
    Content,
    elizaLogger,
    generateText,
    ModelClass,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { composeContext, generateObject } from "@elizaos/core";
import { z, type ZodType } from "zod";

export const TransferSchema: ZodType = z.object({
    recipient: z.string(),
    amount: z.string().or(z.number()),
    tokenAddress: z.string().or(z.null()),
});

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump",
    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
    "amount": "1000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer

If no token address is mentioned, respond with null.
`;

export const transferToken: Action = {
    name: "TRANSFER_TOKEN",
    description: "Transfer a token to a specific address",
    similes: ["TRANSFER_TOKENS", "SEND_TOKENS", "SEND_TOKEN", "SEND_TOKENS_TO_ADDRESS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Validating transfer token action");
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("Transferring token");
        elizaLogger.info("by assbc");



        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        const { object: content } = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.LARGE,
            schema: TransferSchema,
        });

        try {
            // mock txn hash
            const txnHash = "1234567890";

            if (callback) {
                callback({
                    text: `Successfully transferred \nTransaction: ${txnHash}`,
                    content: {
                        success: true,
                        signature: txnHash,
                        content: content,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error transferring token", error);
            if (callback) {
                callback({
                    text: `Error transferring token: ${error}`,
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
                    text: "Transfer 1000 SOL to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I want to transfer 1000 SOL to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
                    action: "TRANSFER_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully transferred 1000 SOL to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
                },
            },
        ],
    ],
} as Action;
