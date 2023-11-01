import type {
  GetWalletClientResult,
} from '@wagmi/core'
import { QueryConfig, QueryFunctionArgs } from '../types/index.js'
import { useNetwork, useQuery, useWalletClient } from 'wagmi'
import { PrepareBuildUserOperationArgs, PrepareBuildUserOperationResult, prepareBuildUserOperation } from '../core/prepareBuildUserOperation.js'


export type UsePrepareBuildUserOperationConfig =
  Partial<PrepareBuildUserOperationArgs> &
    QueryConfig<PrepareBuildUserOperationResult, Error>

type QueryKeyArgs = Partial<PrepareBuildUserOperationArgs>
type QueryKeyConfig = Pick<UsePrepareBuildUserOperationConfig, 'scopeKey'> & {
  activeChainId?: number
  walletClientAddress?: string
}

function queryKey({
  account,
  activeChainId,
  chainId,
  data,
  to,
  value,
  scopeKey,
  walletClientAddress,
}: QueryKeyArgs & QueryKeyConfig) {
  return [
    {
      entity: 'prepareBuildUserOperation',
      activeChainId,
      account,
      chainId,
      data,
      to,
      value,
      scopeKey,
      walletClientAddress,
    },
  ] as const
}

function queryFn({ walletClient }: { walletClient?: GetWalletClientResult }) {
  return ({
    queryKey: [
      {
        account,
        chainId,
        data,
        to,
        value,
      },
    ],
  }: QueryFunctionArgs<typeof queryKey>) => {
    if (!to) throw new Error('to is required')
    return prepareBuildUserOperation({
      account,
      chainId,
      data,
      to,
      value,
      walletClient,
    })
  }
}

/**
 * @description Hook for preparing a transaction to be sent via [`useBuildUserOperation`](/docs/hooks/useBuildUserOperation).
 *
 * Eagerly fetches the parameters required for sending a transaction such as the gas estimate and resolving an ENS address (if required).
 *
 * @example
 * import { useBuildUserOperation, usePrepareBuildUserOperation } from '@zerodev/wagmi'
 *
 * const { request } = usePrepareBuildUserOperation({
 *   to: 'moxey.eth',
 *   value: parseEther('1'),
 * })
 * const result = useBuildUserOperation(request)
 */
export function usePrepareBuildUserOperation({
  account,
  chainId,
  cacheTime,
  data,
  enabled = true,
  scopeKey,
  staleTime,
  suspense,
  to,
  value,
  onError,
  onSettled,
  onSuccess,
}: UsePrepareBuildUserOperationConfig = {}) {
  const { chain: activeChain } = useNetwork()
  const { data: walletClient } = useWalletClient({ chainId })

  const prepareBuildUserOperationQuery = useQuery(
    queryKey({
      activeChainId: activeChain?.id,
      account,
      chainId,
      data,
      scopeKey,
      to,
      value,
      walletClientAddress: walletClient?.account.address,
    }),
    queryFn({ walletClient }),
    {
      cacheTime,
      enabled: Boolean(enabled && walletClient && to),
      staleTime,
      suspense,
      onError,
      onSettled,
      onSuccess,
    },
  )

  return Object.assign(prepareBuildUserOperationQuery, {
    config: {
      mode: 'prepared',
      ...(prepareBuildUserOperationQuery.isSuccess
        ? prepareBuildUserOperationQuery.data
        : undefined),
    } as PrepareBuildUserOperationResult,
  })
}