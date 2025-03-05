import type { Plugin } from "@elizaos/core";
import { getBalance, transferToken } from "./actions";
import { sonicWalletProvider } from "./providers/sonicWallet";

export const sonicPlugin: Plugin = {
    name: "sonic",
    description: "Sonic blockchain plugin for ElizaOS",
    actions: [
        transferToken,
        getBalance,
    ],
    clients: [],
    adapters: [],
    providers: [sonicWalletProvider],
};

export default sonicPlugin;