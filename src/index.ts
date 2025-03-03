import type { Plugin } from "@elizaos/core";
import { transferToken } from "./actions/transferToken/transferToken";
import { getBalance } from "./actions/getBalance";
export const sonicPlugin: Plugin = {
    name: "sonic",
    description: "Sonic blockchain plugin for ElizaOS",
    actions: [
        transferToken,
        getBalance,
    ],
    clients: [],
    adapters: [],
    providers: [],
};

export default sonicPlugin;