import type { Account, Address, Chain } from 'viem'
import { isAddress } from 'viem'

import { WalletClient } from 'wagmi'
import { ConnectorNotFoundError, fetchEnsAddress, getPublicClient, getWalletClient } from '@wagmi/core'
import { assertActiveChain } from '../utilities/assertActiveChain.js'
import { BuildUserOperationArgs, BuildUserOperationParameters } from './buildUserOperation.js'

export type PrepareBuildUserOperationArgs<
  TWalletClient extends WalletClient = WalletClient,
> = Omit<BuildUserOperationParameters<Chain, Account>, 'to'> & {
  /** Chain ID used to validate if the walletClient is connected to the target chain */
  chainId?: number
  to?: string | string[]
  walletClient?: TWalletClient | null
}

export type PrepareBuildUserOperationResult = Omit<
  BuildUserOperationArgs,
  'mode' | 'to'
> & {
  mode: 'prepared'
  to: Address | Address[]
}

const resolveAddress = async (to: Address) => {
  return (to && !isAddress(to)
        ? await fetchEnsAddress({ name: to })
        : (to as Address)) || undefined
}

/**
 * @description Prepares the parameters required for building a user operation.
 *
 * Returns config to be passed through to `buildUserOperation`.
 *
 * @example
 * import { prepareBuildUserOperation, buildUserOperation } from '@zerodev/wagmi'
 *
 * const config = await prepareBuildUserOperation({
 *  request: {
 *    to: 'moxey.eth',
 *    value: parseEther('1'),
 *  }
 * })
 * const result = await buildUserOperation(config)
 */
export async function prepareBuildUserOperation({
  account,
  chainId,
  data,
  to: to_,
  value,
  walletClient: walletClient_,
}: PrepareBuildUserOperationArgs): Promise<PrepareBuildUserOperationResult> {
  const walletClient = walletClient_ ?? (await getWalletClient({ chainId }))
  if (!walletClient) throw new ConnectorNotFoundError()
  if (chainId) assertActiveChain({ chainId })

  let to: Address | Address[]
  if (Array.isArray(to_)) {
    to = []
    let index = 0
    for (let t of to_) {
      const target = await resolveAddress(t as Address)
      if (target && !isAddress(target)) throw new Error('Invalid address')
      to[index] = target as Address
      index++
    }
  } else {
    const target = await resolveAddress(to_ as Address)
    if (target && !isAddress(target)) throw new Error('Invalid address')
    to = target as Address

  }

  return {
    account,
    data,
    mode: 'prepared',
    to: to! as Address | Address[],
    value,
    ...(chainId ? { chainId } : {}),
  }
}