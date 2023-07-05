import type { Address } from 'abitype'
import type { providers } from 'ethers'
import { ExecuteType } from '@zerodevapp/sdk/dist/src/BaseAccountAPI'
import { ZeroDevSigner } from '@zerodevapp/sdk'
import { ConnectorNotFoundError, Hash, ProviderRpcError, UserRejectedRequestError, fetchSigner } from '@wagmi/core'
import { assertActiveChain } from '../utilities/assertActiveChain'

export type BatchSendTransactionPreparedRequest = {
  mode: 'prepared'
  request: Pick<providers.TransactionRequest, 'data' | 'gasLimit' | 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas'>,
}
export type BatchSendTransactionUnpreparedRequest = {
  mode: 'recklesslyUnprepared'
  request: providers.TransactionRequest
}

export type BatchSendTransactionArgs = {
  chainId?: number
} & (BatchSendTransactionPreparedRequest | BatchSendTransactionUnpreparedRequest)

export type BatchSendTransactionResult = {
  hash: Hash
  wait: providers.TransactionResponse['wait']
}

export async function batchSendTransaction({
  chainId,
  mode,
  request,
}: BatchSendTransactionArgs): Promise<BatchSendTransactionResult> {
  const signer = await fetchSigner<ZeroDevSigner>()
  if (!signer) throw new ConnectorNotFoundError()

  if (mode === 'prepared') {
    if (!request.gasLimit) throw new Error('`gasLimit` is required')
  }

  if (chainId) assertActiveChain({ chainId, signer })

  try {
    const { hash, wait } = await signer.sendTransaction(
      request,
      ExecuteType.EXECUTE_BATCH
    )

    return { hash: hash as Hash, wait }
  } catch (error) {
    if (
      (error as ProviderRpcError).code === 4001 ||
      (error as {code: string}).code === 'ACTION_REJECTED'
    )
      throw new UserRejectedRequestError(error)
    throw error
  }
}