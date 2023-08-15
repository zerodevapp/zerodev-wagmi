import type {
  GetWalletClientResult,
} from '@wagmi/core'
import { QueryConfig, QueryFunctionArgs } from '../types'
import { useNetwork, useQuery, useWalletClient } from 'wagmi'
import { PrepareSendUserOperationArgs, PrepareSendUserOperationResult, prepareSendUserOperation } from '../core/prepareSendUserOperation'


export type UsePrepareSendUserOperationConfig =
  Partial<PrepareSendUserOperationArgs> &
    QueryConfig<PrepareSendUserOperationResult, Error>

type QueryKeyArgs = Partial<PrepareSendUserOperationArgs>
type QueryKeyConfig = Pick<UsePrepareSendUserOperationConfig, 'scopeKey'> & {
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
      entity: 'prepareSendUserOperation',
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
    return prepareSendUserOperation({
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
 * @description Hook for preparing a transaction to be sent via [`useSendUserOperation`](/docs/hooks/useSendUserOperation).
 *
 * Eagerly fetches the parameters required for sending a transaction such as the gas estimate and resolving an ENS address (if required).
 *
 * @example
 * import { useSendUserOperation, usePrepareSendUserOperation } from '@zerodev/wagmi'
 *
 * const { request } = usePrepareSendUserOperation({
 *   to: 'moxey.eth',
 *   value: parseEther('1'),
 * })
 * const result = useSendUserOperation(request)
 */
export function usePrepareSendUserOperation({
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
}: UsePrepareSendUserOperationConfig = {}) {
  const { chain: activeChain } = useNetwork()
  const { data: walletClient } = useWalletClient({ chainId })

  const prepareSendUserOperationQuery = useQuery(
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

  return Object.assign(prepareSendUserOperationQuery, {
    config: {
      mode: 'prepared',
      ...(prepareSendUserOperationQuery.isSuccess
        ? prepareSendUserOperationQuery.data
        : undefined),
    } as PrepareSendUserOperationResult,
  })
}