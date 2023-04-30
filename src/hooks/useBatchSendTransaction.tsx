import * as React from 'react'
import { MutationConfig } from '../types'
import { useMutation } from 'wagmi'
import { BatchSendTransactionArgs, BatchSendTransactionPreparedRequest, BatchSendTransactionResult, BatchSendTransactionUnpreparedRequest, batchSendTransaction } from '../core/batchSendTransaction'

export type UseBatchSendTransactionArgs = Omit<
  BatchSendTransactionArgs,
  'request' | 'type'
> &
  (
    | {
        mode: 'prepared'
        request: BatchSendTransactionPreparedRequest['request'] | undefined
      }
    | {
        mode: 'recklesslyUnprepared'
        request?: BatchSendTransactionUnpreparedRequest['request']
      }
  )
export type UseBatchSendTransactionMutationArgs = {
  recklesslySetUnpreparedRequest: BatchSendTransactionUnpreparedRequest['request']
}
export type UseBatchSendTransactionConfig = MutationConfig<
  BatchSendTransactionResult,
  Error,
  BatchSendTransactionArgs
>

type BatchSendTransactionFn = (
  overrideConfig?: UseBatchSendTransactionMutationArgs,
) => void
type BatchSendTransactionAsyncFn = (
  overrideConfig?: UseBatchSendTransactionMutationArgs,
) => Promise<BatchSendTransactionResult>
type MutateFnReturnValue<Args, Fn> = Args extends {
  mode: 'recklesslyUnprepared'
}
  ? Fn
  : Fn | undefined

export const mutationKey = (args: UseBatchSendTransactionArgs) =>
  [{ entity: 'sendBatchTransaction', ...args }] as const

const mutationFn = ({ chainId, mode, request }: BatchSendTransactionArgs) => {
  return batchSendTransaction({
    chainId,
    mode,
    request,
  } as BatchSendTransactionArgs)
}

export function useBatchSendTransaction<
  Args extends UseBatchSendTransactionArgs = UseBatchSendTransactionArgs,
>({
  chainId,
  mode,
  request,
  onError,
  onMutate,
  onSettled,
  onSuccess,
}: Args & UseBatchSendTransactionConfig) {
  const {
    data,
    error,
    isError,
    isIdle,
    isLoading,
    isSuccess,
    mutate,
    mutateAsync,
    reset,
    status,
    variables,
  } = useMutation(
    mutationKey({
      chainId,
      mode,
      request,
    } as BatchSendTransactionArgs),
    mutationFn,
    {
      onError,
      onMutate,
      onSettled,
      onSuccess,
    },
  )

  const sendTransaction = React.useCallback(
    (args?: UseBatchSendTransactionMutationArgs) =>
      mutate({
        chainId,
        mode,
        request: args?.recklesslySetUnpreparedRequest ?? request,
      } as BatchSendTransactionArgs),
    [chainId, mode, mutate, request],
  )

  const sendTransactionAsync = React.useCallback(
    (args?: UseBatchSendTransactionMutationArgs) =>
      mutateAsync({
        chainId,
        mode,
        request: args?.recklesslySetUnpreparedRequest ?? request,
      } as BatchSendTransactionArgs),
    [chainId, mode, mutateAsync, request],
  )

  return {
    data,
    error,
    isError,
    isIdle,
    isLoading,
    isSuccess,
    reset,
    sendTransaction: (mode === 'prepared' && !request
      ? undefined
      : sendTransaction) as MutateFnReturnValue<Args, BatchSendTransactionFn>,
    sendTransactionAsync: (mode === 'prepared' && !request
      ? undefined
      : sendTransactionAsync) as MutateFnReturnValue<
      Args,
      BatchSendTransactionAsyncFn
    >,
    status,
    variables,
  }
}