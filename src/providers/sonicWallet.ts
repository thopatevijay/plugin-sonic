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

class SonicWalletManager {
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

function initializeSonicWallet(runtime: IAgentRuntime): SonicWalletManager {
    const privateKey = runtime.getSetting("SONIC_WALLET_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("SONIC_WALLET_PRIVATE_KEY is not configured");
    }

    const rpcUrl = runtime.getSetting("SONIC_RPC_URL") ?? CHAIN_RPC_URLS.MAINNET;
    const chain = resolveChainFromRPCUrl(rpcUrl);

    return new SonicWalletManager(privateKey, chain);
}

export const sonicWalletProvider: Provider = {
    async get(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> {
        try {
            const wallet = initializeSonicWallet(runtime);
            const address = wallet.getAddress();
            const balance = await wallet.getBalance();
            elizaLogger.info("Sonic Wallet", { address, balance });

            return [
                'Sonic Wallet',
                `Address: ${address}`,
                `Balance: ${balance} S`,
            ].join('\n');
        } catch (error) {
            elizaLogger.error("Wallet operation failed:", error);
            return `Failed to access wallet information: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
};
