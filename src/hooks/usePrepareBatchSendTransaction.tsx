import type {
    FetchSignerResult,
} from '@wagmi/core'
import { QueryConfig, QueryFunctionArgs } from '../types'
import { PrepareBatchSendTransactionArgs, PrepareBatchSendTransactionResult, prepareBatchSendTransaction } from '../core/prepareBatchSendTransaction'
import { useNetwork, useQuery, useSigner } from 'wagmi'
import { ZeroDevSigner } from '@zerodevapp/sdk'
  
export type UsePrepareBatchSendTransactionConfig =
Partial<PrepareBatchSendTransactionArgs> &
    QueryConfig<PrepareBatchSendTransactionResult, Error>

type QueryKeyArgs = Partial<PrepareBatchSendTransactionArgs>
type QueryKeyConfig = Pick<UsePrepareBatchSendTransactionConfig, 'scopeKey'> & {
    activeChainId?: number
    signerAddress?: string
}

function queryKey({
    activeChainId,
    chainId,
    calls,
    scopeKey,
    signerAddress,
    request
}: QueryKeyArgs & QueryKeyConfig) {
    return [
        {
        entity: 'prepareBatchSendTransaction',
        activeChainId,
        chainId,
        calls,
        scopeKey,
        signerAddress,
        request
        },
    ] as const
}

function queryFn({ signer }: { signer?: FetchSignerResult<ZeroDevSigner> }) {
    return ({
        queryKey: [{ chainId, calls, request }],
    }: QueryFunctionArgs<typeof queryKey>) => {
        if (!calls) throw new Error('calls is required')
        return prepareBatchSendTransaction({
            chainId,
            signer,
            calls,
            request
        })
    }
}
export function usePrepareBatchSendTransaction({
        chainId,
        calls,
        cacheTime,
        enabled = true,
        scopeKey,
        staleTime,
        suspense,
        onError,
        onSettled,
        onSuccess,
        request
    }: UsePrepareBatchSendTransactionConfig = {}) {
    const { chain: activeChain } = useNetwork()
    const { data: signer } = useSigner<ZeroDevSigner>({ chainId })

    const prepareSendTransactionQuery = useQuery(
        queryKey({
            activeChainId: activeChain?.id,
            chainId,
            calls,
            scopeKey,
            signerAddress: signer?.address,
            request
        }),
        queryFn({ signer }),
        {
            cacheTime,
            enabled: Boolean(enabled && signer && calls),
            staleTime,
            suspense,
            onError,
            onSettled,
            onSuccess,
        },
    )
    return Object.assign(prepareSendTransactionQuery, {
        config: {
          request: undefined,
          mode: 'prepared',
          ...prepareSendTransactionQuery.data,
        } as PrepareBatchSendTransactionResult,
    })
}