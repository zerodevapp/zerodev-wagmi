import { ConnectorNotFoundError, Hash, getWalletClient } from '@wagmi/core'
import type {
  Account,
  Address,
  Chain,
} from 'viem'
import { assertActiveChain } from '../utilities/assertActiveChain'
import { prepareSendUserOperation } from './prepareSendUserOperation'
import { GetAccountParameter } from 'viem/dist/types/types/account'
import { GetChain } from 'viem/dist/types/types/chain'
import { UserOperationCallData } from '@alchemy/aa-core'

export type SendUserOperationParameters<
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined,
  TChainOverride extends Chain | undefined = Chain,
> = {
  to: UserOperationCallData['target'] | UserOperationCallData['target'][],
  data?: UserOperationCallData['data'] | UserOperationCallData['data'][],
  value?: UserOperationCallData['value'] | UserOperationCallData['value'][],
} &
  GetAccountParameter<TAccount> &
  GetChain<TChain, TChainOverride>


export type SendUserOperationArgs = {
  /** Chain ID used to validate if the walletClient is connected to the target chain */
  chainId?: number
  mode?: 'prepared'
  to: string | string[]
} & Omit<SendUserOperationParameters<Chain, Account>, 'chain' | 'to'>

export type SendUserOperationResult = {
  hash: Hash
}

/**
 * @description Function to send a user operation.
 *
 * It is recommended to pair this with the `prepareSendUserOperation` function to avoid
 * [UX pitfalls](https://wagmi.sh/react/prepare-hooks#ux-pitfalls-without-prepare-hooks).
 *
 * @example
 * import { prepareSendUserOperation, sendUserOperation } from '@zerdevapp/wagmi'
 *
 * const config = await prepareSendUserOperation({
 *  to: 'moxey.eth',
 *  value: parseEther('1'),
 * })
 * const result = await sendUserOperation(config)
 */
export async function sendUserOperation({
  account,
  chainId,
  data,
  mode,
  to,
  value,
}: SendUserOperationArgs): Promise<SendUserOperationResult> {
  /********************************************************************/
  /** START: iOS App Link cautious code.                              */
  /** Do not perform any async operations in this block.              */
  /** Ref: wagmi.sh/react/prepare-hooks#ios-app-link-constraints */
  /********************************************************************/

  // `getWalletClient` isn't really "asynchronous" as we have already
  // initialized the Wallet Client upon user connection, so it will return
  // immediately.
  const walletClient = await getWalletClient({ chainId })
  if (!walletClient) throw new ConnectorNotFoundError()

  if (chainId) assertActiveChain({ chainId })

  let args: SendUserOperationParameters<Chain, Account>
  if (mode === 'prepared') {
    args = {
      account,
      chain: null,
      data,
      to: to as Address | Address[],
      value,
    }
  } else {
    args = await prepareSendUserOperation({
      account,
      chainId,
      data,
      to,
      value,
    })
  }

  const isArray = Array.isArray(args.to) || Array.isArray(args.data) || Array.isArray(args.value)
  if (isArray) {
    const isValidTo = Array.isArray(args.to)
    const isValidData = args.data === undefined || (Array.isArray(args.data) && args.data.length === args.to.length)
    const isValidValue = args.value === undefined || (Array.isArray(args.value) && args.value.length === args.to.length)
    if (!isValidTo || !isValidData || !isValidValue) {
      throw new Error("If one parameter is an array, then all parameters need to be an array.")
    } 
  }

  //@ts-expect-error
  const { hash } = await walletClient.sendUserOperation(isArray ? args.to.map((target, index) => ({
    target,
    data: args.data && Array.isArray(args.data) ? args.data[index] : undefined,
    value: args.value && Array.isArray(args.value) ? args.value[index] : undefined
  })) : {
    target: args.to,
    data: args.data,
    value: args.value
  })

  //@ts-expect-error
  return { hash: await walletClient.waitForUserOperationTransaction(hash) }
}