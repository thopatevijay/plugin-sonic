import {
    elizaLogger,
    ModelClass,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { composeContext, generateObjectDeprecated } from "@elizaos/core";
import { TRANSFER_TEMPLATE } from "../../constant";
import { TransferContent, Transaction, TransferParams } from "../../types";
import { initializeSonicWallet } from "../../providers/sonicWallet";
import { SonicWalletManager } from "../../providers/sonicWallet";
import { Hex, formatEther, parseEther } from "viem";

class TransferError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'TransferError';
    }
}

class TransferAction {
    constructor(private readonly wallet: SonicWalletManager) { }

    async transfer(params: TransferParams): Promise<Transaction> {
        const walletClient = this.wallet.getWalletClient();

        if (!walletClient.account) {
            throw new TransferError('Wallet account not found');
        }

        try {
            const hash = await walletClient.sendTransaction({
                account: walletClient.account,
                to: params.toAddress,
                value: parseEther(params.amount),
                data: params.data as Hex ?? '0x',
                chain: walletClient.chain,
            });

            elizaLogger.debug('Transaction submitted', { hash });

            return {
                hash,
                from: walletClient.account.address,
                to: params.toAddress,
                amount: parseEther(params.amount),
                data: params.data as Hex ?? '0x',
                explorerTxnUrl: `${walletClient.chain?.blockExplorers?.default?.url}/tx/${hash}`,
            };
        } catch (error) {
            elizaLogger.error('Transaction failed', { error, params });
            throw new TransferError('Failed to transfer tokens', error);
        }
    }
}

const buildTransferDetails = async (
    state: State,
    runtime: IAgentRuntime,
): Promise<TransferParams> => {
    const transferContext = composeContext({
        state,
        template: TRANSFER_TEMPLATE,
    });

    const transferDetails = await generateObjectDeprecated({
        runtime,
        context: transferContext,
        modelClass: ModelClass.LARGE,
    }) as TransferParams;

    if (!isTransferContent(runtime, transferDetails)) {
        throw new Error("Invalid content for TRANSFER_TOKEN action.");
    }

    return transferDetails;
}

function isTransferContent(
    _runtime: IAgentRuntime,
    content: unknown
): content is TransferContent {
    return (
        typeof (content as TransferContent).toAddress === "string" &&
        (typeof (content as TransferContent).amount === "string" ||
            typeof (content as TransferContent).amount === "number")
    );
}

export const transferToken: Action = {
    name: "TRANSFER_TOKEN",
    description: "Transfer SONIC token to a specific address",
    similes: ["TRANSFER_TOKENS", "SEND_TOKENS", "SEND_TOKEN", "SEND_TOKENS_TO_ADDRESS"],

    validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
        const walletPrivateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
        if (!walletPrivateKey) {
            elizaLogger.error("Validation failed: Missing SONIC_WALLET_PRIVATE_KEY");
            return false;
        }
        return true;
    },
    suppressInitialMessage: true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const currentState = state ?? await runtime.composeState(message);
            const updatedState = await runtime.updateRecentMessageState(currentState);

            const sonicWallet = initializeSonicWallet(runtime);
            const action = new TransferAction(sonicWallet);
            const transferDetails = await buildTransferDetails(updatedState, runtime);

            const transferResp = await action.transfer(transferDetails);

            if (callback) {
                const formattedAmount = formatEther(transferResp.amount);
                callback({
                    text: [
                        '🎯 Transaction Receipt',
                        '------------------------',
                        '✅ Status: Success',
                        `Amount: ${formattedAmount} S`,
                        `To: ${transferResp.to}`,
                        `From: ${transferResp.from}`,
                        `Transaction Hash: ${transferResp.hash}`,
                        '------------------------'
                    ].join('\n'),
                    content: {
                        success: true,
                        signature: transferResp.hash,
                        amount: formattedAmount,
                        recipient: transferResp.to,
                        explorerTxnUrl: transferResp.explorerTxnUrl,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error('Handler failed', { error });

            if (callback) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                callback({
                    text: `Transaction failed: ${errorMessage}`,
                    content: { error },
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
                    action: "TRANSFER_TOKEN",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll help you transfer 1 ETH to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    action: "TRANSFER_TOKEN",
                },
            },
        ],
    ],
} as Action;
