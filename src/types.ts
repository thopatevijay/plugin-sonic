import { Content } from "@elizaos/core";
import { Address, Log } from "viem";

export interface BalanceContent extends Content {
    address: string;
}

export interface TransferContent extends Content {
    recipient: string;
    amount: string | number;
}

export interface Transaction {
    hash: string;
    from: Address;
    to: Address;
    amount: bigint;
    data?: `0x${string}`;
    logs?: Log[];
    explorerTxnUrl: string;
}

export interface TransferParams {
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
}