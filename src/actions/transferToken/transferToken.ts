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
import { TransferContent } from "../../types";
import { initializeSonicWallet } from "../../providers/sonicWallet";
import { SonicWalletManager } from "../../providers/sonicWallet";
import { Hex, ByteArray, formatEther, parseEther, Address, Log } from "viem";

interface Transaction {
    hash: string;
    from: Address;
    to: Address;
    amount: bigint;
    data?: `0x${string}`;
    logs?: Log[];
    explorerTxnUrl: string;
}

interface TransferParams {
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
}

class TransferAction {
    constructor(private wallet: SonicWalletManager) { }

    async transfer(params: TransferParams): Promise<Transaction> {

        if (!params.data) {
            params.data = "0x";
        }

        const walletClient = this.wallet.getWalletClient();
        elizaLogger.info("Wallet client", walletClient);

        // if (!walletClient.account) {
        //     throw new Error("Wallet account not found");
        // }

        try {
            const hash = await walletClient.sendTransaction({
                account: walletClient.account,
                to: params.toAddress,
                value: parseEther(params.amount),
                data: params.data as Hex,
                kzg: {
                    blobToKzgCommitment: (_: ByteArray): ByteArray => {
                        throw new Error("Function not implemented.");
                    },
                    computeBlobKzgProof: (
                        _blob: ByteArray,
                        _commitment: ByteArray
                    ): ByteArray => {
                        throw new Error("Function not implemented.");
                    },
                },
                chain: walletClient.chain,
            });

            elizaLogger.info("Transaction hash", hash);
            return {
                hash,
                from: walletClient.account?.address as `0x${string}`,
                to: params.toAddress,
                amount: parseEther(params.amount),
                data: params.data as Hex,
                explorerTxnUrl: `${walletClient.chain?.blockExplorers?.default?.url}/tx/${hash}`,
            };
        } catch (error) {
            elizaLogger.error("Error transferring token", error);
            throw new Error("Error transferring token");
        }
    }
}

const buildTransferDetails = async (
    state: State,
    runtime: IAgentRuntime,
    sonicWallet: SonicWalletManager
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
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Validating transfer token action");
        // Check if SONIC_WALLET_PRIVATE_KEY is provided
        const walletPrivateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY") as string;
        if (!walletPrivateKey) {
            elizaLogger.error("Missing SONIC_WALLET_PRIVATE_KEY");
            return false;
        }
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

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const sonicWallet = initializeSonicWallet(runtime);
        const action = new TransferAction(sonicWallet);

        const transferDetails = await buildTransferDetails(
            state,
            runtime,
            sonicWallet
        );

        try {
            const transferResp = await action.transfer(transferDetails);
            elizaLogger.info("Transfer response", transferResp);
            if (callback) {
                callback({
                    text: `
                        🎯 Transaction Receipt
                        ------------------------
                        Status: ✅ Success
                        Amount: ${formatEther(transferResp.amount)} S
                        To: ${transferResp.to}
                        From: ${transferResp.from}
                        Transaction Hash: ${transferResp.hash}
                        ------------------------
                    `,
                    content: {
                        success: true,
                        signature: transferResp.hash,
                        amount: formatEther(transferResp.amount),
                        recipient: transferResp.to,
                        explorerTxnUrl: transferResp.explorerTxnUrl,
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
                    text: "Transfer 0.1 S token to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    action: "TRANSFER_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I want to transfer 1 SONIC token to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                    action: "TRANSFER_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 0.1 S token to 0x5C951583CEb79828b1fAB7257FE497A9Dc5896e6",
                },
            },
        ],
    ],
} as Action;
