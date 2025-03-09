import {
    createPublicClient,
    createWalletClient,
    http,
    formatEther,
    type PublicClient,
    type WalletClient,
    type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { CHAIN_RPC_URLS } from "../constant";

export class SonicWalletManager {
    private readonly account: ReturnType<typeof privateKeyToAccount>;
    private readonly publicClient: PublicClient;
    private readonly walletClient: WalletClient;

    constructor(privateKey: string, chain: Chain) {
        try {
            const hexPrivateKey = this.addHexPrefix(privateKey);
            this.account = privateKeyToAccount(hexPrivateKey);
            const transport = http(chain.rpcUrls.default.http[0]);

            this.publicClient = createPublicClient({
                chain,
                transport,
            });

            this.walletClient = createWalletClient({
                account: this.account,
                chain,
                transport,
            });
        } catch (error) {
            throw new Error(`Failed to initialize wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private addHexPrefix(privateKey: string): `0x${string}` {
        return privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
    }

    public getAddress(): string {
        return this.account.address;
    }

    public async getBalance(): Promise<string> {
        try {
            const balance = await this.publicClient.getBalance({
                address: this.account.address,
            });
            return formatEther(balance);
        } catch (error) {
            throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public getWalletClient(): WalletClient {
        return this.walletClient;
    }

    public getNetwork(): string {
        return this.publicClient.chain?.name ?? "Unknown Network";
    }
}

function resolveChainFromRPCUrl(rpcUrl: string): Chain {
    switch (rpcUrl) {
        case CHAIN_RPC_URLS.MAINNET:
            return viemChains.sonic;
        case CHAIN_RPC_URLS.TESTNET:
            return viemChains.sonicBlazeTestnet;
        default:
            throw new Error(`Unsupported RPC URL: ${rpcUrl}, we only support ${Object.values(CHAIN_RPC_URLS).join(', ')}`);
    }
}

export function initializeSonicWallet(runtime: IAgentRuntime): SonicWalletManager | null {
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
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}

export const sonicWalletProvider: Provider = {
    async get(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> {
        const wallet = initializeSonicWallet(runtime);
        
        if (!wallet) {
            return [
                `❌ Sonic Wallet Error:`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `Unable to initialize wallet.`,
                `Please check your wallet configuration:`,
                `- Ensure SONIC_WALLET_PRIVATE_KEY is configured`,
                `- Verify the private key format is correct`,
                `- Check RPC URL configuration`,
                `━━━━━━━━━━━━━━━━━━━━━`
            ].join('\n');
        }

        try {
            const [address, balance] = await Promise.all([
                wallet.getAddress(),
                wallet.getBalance()
            ]);

            const rpcUrl = runtime.getSetting("SONIC_RPC_URL");
            const network = rpcUrl === CHAIN_RPC_URLS.MAINNET ? "Mainnet" : "Testnet";

            elizaLogger.info("📱 Sonic Wallet Status :", {
                address,
                balance,
                network
            });

            return [
                `📱 Sonic Wallet Status:`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `🔑 Address: ${address}`,
                `💰 Balance: ${balance} S`,
                `🌐 Network: ${network}`,
                `━━━━━━━━━━━━━━━━━━━━━`
            ].join('\n');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            elizaLogger.error("Sonic Wallet Operation Failed:", {
                error: errorMessage,
                timestamp: new Date().toISOString()
            });

            return [
                `❌ Sonic Wallet Error:`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `Unable to access wallet information.`,
                `Error: ${errorMessage}`,
                `Please check your wallet configuration and try again.`,
                `━━━━━━━━━━━━━━━━━━━━━`
            ].join('\n');
        }
    },
};
