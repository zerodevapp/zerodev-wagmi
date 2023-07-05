import { ConnectorNotFoundError, fetchSigner } from '@wagmi/core';
import { ZeroDevSigner } from '@zerodevapp/sdk';
import { ExecuteType } from '@zerodevapp/sdk/dist/src/BaseAccountAPI';
import type { providers } from 'ethers';
import { assertActiveChain } from '../utilities/assertActiveChain';
import { TransactionRequest } from '@ethersproject/providers';
import { Deferrable } from 'ethers/lib/utils.js';
import { Call } from '@zerodevapp/sdk/dist/src/types';

export type PrepareBatchSendTransactionArgs<TSigner extends ZeroDevSigner = ZeroDevSigner> = {
  chainId?: number
  calls: Call[],
  signer?: TSigner | null
  request?: Pick<providers.TransactionRequest, 'gasLimit' | 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas'>,
}

export type PrepareBatchSendTransactionResult = {
  chainId?: number
  request: Pick<providers.TransactionRequest, 'data' | 'gasLimit' | 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas'>,
  mode: 'prepared'
}
export async function prepareBatchSendTransaction<TSigner extends ZeroDevSigner = ZeroDevSigner,>({
  chainId,
  signer: signer_,
  calls,
  request = {}
}: PrepareBatchSendTransactionArgs<TSigner>): Promise<PrepareBatchSendTransactionResult> {
  const signer = signer_ ?? (await fetchSigner<ZeroDevSigner>({ chainId }));
  if (!signer) throw new ConnectorNotFoundError();

  if (chainId) {
    assertActiveChain({ chainId, signer });
  }

  const transactionRequest = await signer.getExecBatchTransaction(calls) as Promise<TransactionRequest>;
  const gasLimit = (await signer.estimateGas(transactionRequest as Deferrable<TransactionRequest>, ExecuteType.EXECUTE_BATCH));

  return {
    chainId,
    mode: 'prepared',
    request: {
      ...request,
      gasLimit,
      ...transactionRequest,
    }
  };
}
