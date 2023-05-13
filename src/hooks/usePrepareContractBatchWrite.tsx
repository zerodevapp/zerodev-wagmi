import { Contract } from "ethers";
import { useMemo } from "react";
import { useSigner } from "wagmi";
import { UsePrepareBatchSendTransactionConfig, usePrepareBatchSendTransaction } from "./usePrepareBatchSendTransaction";

export type ContractCall = {
    address: string;
    abi: any;
    functionName: string;
    args: any[];
}

export const usePrepareContractBatchWrite = (config: Omit<UsePrepareBatchSendTransactionConfig, 'calls'> & {calls: ContractCall[]}) => {
    const {data: signer} = useSigner()
    const calls = useMemo(() => {
        if (config?.calls?.length && Array.isArray(config.calls) && signer) {
            return config.calls.map((call) => ({
                to: call.address,
                data: (new Contract(call.address, call.abi, signer)).interface.encodeFunctionData(call.functionName, call.args)
            }))
        }
        return []
    }, [config?.calls, signer])
    return usePrepareBatchSendTransaction({
        ...config,
        calls,
    })
}