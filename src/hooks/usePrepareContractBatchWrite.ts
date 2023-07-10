import { useMemo } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import { UsePrepareSendUserOperationConfig, usePrepareSendUserOperation } from "./usePrepareSendUserOperation";
import { isStringArray } from "../utilities/isStringArray";

export type ContractCall = {
    address: string;
    abi: any;
    functionName: string;
    args: any[];
}

export const usePrepareContractBatchWrite = (config: Omit<UsePrepareSendUserOperationConfig, 'to' | 'data'> & {calls: ContractCall[]}) => {
    const to = useMemo(() => {
        return config.calls.map(call => call.address)
    }, [config?.calls])
    const data = useMemo(() => {
        return config.calls.map(call => encodeFunctionData({abi: isStringArray(call.abi) ? parseAbi(call.abi) : call.abi, functionName: call.functionName, args: call.args}))
    }, [config?.calls])
    return usePrepareSendUserOperation({
        ...config,
        to,
        data,
    })
}