import type { Plugin } from "@elizaos/core";
import { transferToken } from "./actions/transferToken/transferToken";
// interface Plugin {
//     actions?: Action[];
//     evaluators?: Evaluator[];
//     services?: Service[];
//     providers?: Provider[];
//     initialize?(runtime: AgentRuntime): Promise<void>;
//   }

export const sonicPlugin: Plugin = {
    name: "sonic",
    description: "Sonic blockchain plugin for ElizaOS",
    actions: [
        transferToken,
    ],
    clients: [],
    adapters: [],
    providers: [],
};

export default sonicPlugin;