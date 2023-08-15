import * as React from 'react'
import { MutationConfig } from '../types';
import { useMutation } from 'wagmi';
import { SendUserOperationArgs, SendUserOperationResult, sendUserOperation } from '../core/sendUserOperation';


export type UseSendUserOperationArgs<
  TMode extends 'prepared' | undefined = 'prepared' | undefined,
> = Omit<SendUserOperationArgs, 'to'> & { mode?: TMode; to?: string | string[] }
export type UseSendUserOperationMutationArgs = SendUserOperationArgs
export type UseSendUserOperationConfig = MutationConfig<
  SendUserOperationResult,
  Error,
  UseSendUserOperationArgs
>

type SendUserOperationFn = (
  overrideConfig?: UseSendUserOperationMutationArgs,
) => void
type SendUserOperationAsyncFn = (
  overrideConfig?: UseSendUserOperationMutationArgs,
) => Promise<SendUserOperationResult>
type MutateFnReturnValue<TMode, TFn> = TMode extends 'prepared'
  ? TFn | undefined
  : TFn

export const mutationKey = (args: UseSendUserOperationArgs) =>
  [{ entity: 'sendUserOperation', ...args }] as const

const mutationFn = ({
  account,
  chainId,
  data,
  mode,
  to,
  value,
}: UseSendUserOperationArgs) => {
  if (!to) throw new Error('to is required.')
  return sendUserOperation({
    account,
    chainId,
    data,
    mode,
    to,
    value,
  })
}

/**
 * @description Hook for sending a transaction.
 *
 * It is recommended to pair this with the [`usePrepareSendUserOperation` hook](/docs/prepare-hooks/usePrepareSendUserOperation)
 * to [avoid UX pitfalls](https://wagmi.sh/react/prepare-hooks#ux-pitfalls-without-prepare-hooks).
 *
 * @example
 * import { useSendUserOperation, usePrepareSendUserOperation } from '@zerodev/wagmi'
 *
 * const config = usePrepareSendUserOperation({
 *   request: {
 *     to: 'moxey.eth',
 *     value: parseEther('1'),
 *   }
 * })
 * const result = useSendUserOperation(config)
 */
export function useSendUserOperation<
  TMode extends 'prepared' | undefined = undefined,
>({
  account,
  chainId,
  data: data_,
  mode,
  to,
  value,
  onError,
  onMutate,
  onSettled,
  onSuccess,
}: UseSendUserOperationArgs<TMode> & UseSendUserOperationConfig = {}) {
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
      account,
      chainId,
      data: data_,
      mode,
      to,
      value,
    }),
    mutationFn,
    {
      onError,
      onMutate,
      onSettled,
      onSuccess,
    },
  )

  const sendUserOperation = React.useCallback(
    (args?: UseSendUserOperationMutationArgs) =>
      mutate({
        chainId,
        mode,
        ...(args || {
          account,
          chainId,
          data: data_,
          mode,
          value,
          to,
        }),
      }),
    [
      account,
      chainId,
      data_,
      mode,
      mutate,
      to,
      value,
    ],
  )

  const sendUserOperationAsync = React.useCallback(
    (args?: UseSendUserOperationMutationArgs) =>
      mutateAsync({
        chainId,
        mode,
        ...(args || {
          account,
          chainId,
          data: data_,
          mode,
          value,
          to,
        }),
      }),
    [
      account,
      chainId,
      data_,
      mode,
      mutateAsync,
      to,
      value,
    ],
  )

  return {
    data,
    error,
    isError,
    isIdle,
    isLoading,
    isSuccess,
    reset,
    sendUserOperation: (mode === 'prepared' && !to
      ? undefined
      : sendUserOperation) as MutateFnReturnValue<TMode, SendUserOperationFn>,
    sendUserOperationAsync: (mode === 'prepared' && !to
      ? undefined
      : sendUserOperationAsync) as MutateFnReturnValue<
      TMode,
      SendUserOperationAsyncFn
    >,
    status,
    variables,
  }
}