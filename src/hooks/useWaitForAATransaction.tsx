import { useEffect, useMemo, useState } from "react"
import { useWaitForTransaction } from "wagmi"
import { SendTransactionResult } from '@wagmi/core';

export const useWaitForAATransaction = ({wait, ...args}: Parameters<typeof useWaitForTransaction>[0] & {wait?: SendTransactionResult['wait']}) => {

    useEffect(() => {
        setHash(undefined)
    }, [wait])
    
    const [hash, setHash] = useState<`0x${string}`>()
    if (wait && !hash) {
        wait().then(({bundleTransactionHash}: any) => {
            setHash(bundleTransactionHash)
        })
    }
    return useWaitForTransaction(useMemo(() => ({...args, hash}), [args, hash]))
}