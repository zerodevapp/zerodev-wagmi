import { useMemo } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import { UsePrepareSendUserOperationConfig, usePrepareSendUserOperation } from "./usePrepareSendUserOperation.js";
import { isStringArray } from "../utilities/isStringArray.js";
import { UserOperationCallData } from '@alchemy/aa-core'

export type ContractCall = {
    address: string;
    abi: any;
    functionName: string;
    args: any[];
    value?: bigint
}

export type UserOpCall = {
    to: UserOperationCallData['target'],
    data?: UserOperationCallData['data'],
    value?: UserOperationCallData['value'],
}

export const usePrepareContractBatchWrite = (config: Omit<UsePrepareSendUserOperationConfig, 'to' | 'data'> & {calls:(ContractCall | UserOpCall)[]}) => {
    const to = useMemo(() => {
        if (!config.enabled) return []
        if (config.calls) {
            return config.calls.map(call => {
                if ('data' in call) {
                    return call.to;
                }
                if ('address' in call) {
                    return call.address;
                }
                return ''
            })
        }
    }, [config?.calls])
    const data = useMemo(() => {
        if (!config.enabled) return []
        if (config.calls) return config.calls.map(call => {
            if ('data' in call && call.data) {
                return call.data;
            }
            if ('address' in call) {
                return encodeFunctionData({abi: isStringArray(call.abi) ? parseAbi(call.abi) : call.abi, functionName: call.functionName, args: call.args})
            }
            return '0x'
        })
        return []
    }, [config?.calls])
    const value = useMemo(() => {
        if (!config.enabled) return []
        return config.calls.map(call => call.value)
    }, [config?.calls])
    return usePrepareSendUserOperation({
        ...config,
        to,
        data,
        value
    })
}