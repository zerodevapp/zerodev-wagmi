import { useMemo } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import { useSendUserOperation } from "./useSendUserOperation";
import { isStringArray } from "../utilities/isStringArray";

export type ContractCall = {
    address: string;
    abi: any;
    functionName: string;
    args: any[];
}

export const useContractBatchWrite = (config: Parameters<typeof useSendUserOperation>[0]  & {calls?: ContractCall[]}) => {
    const to = useMemo(() => {
        if (config.calls) return config.calls.map(call => call.address)
        return []
    }, [config?.calls])
    const data = useMemo(() => {
        if (config.calls) return config.calls.map(call => encodeFunctionData({abi: isStringArray(call.abi) ? parseAbi(call.abi) : call.abi, functionName: call.functionName, args: call.args}))
        return []
    }, [config?.calls])
    return useSendUserOperation({
        ...config,
        to: to.length > 0 ? to : config.to,
        data: data.length > 0 ? data : config.data,
    })
}