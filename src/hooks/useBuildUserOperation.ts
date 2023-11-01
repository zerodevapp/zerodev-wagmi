import * as React from 'react'
import { MutationConfig } from '../types';
import { useMutation } from 'wagmi';
import { BuildUserOperationArgs, BuildUserOperationResult, buildUserOperation } from '../core/buildUserOperation.js';


export type UseBuildUserOperationArgs<
  TMode extends 'prepared' | undefined = 'prepared' | undefined,
> = Omit<BuildUserOperationArgs, 'to'> & { mode?: TMode; to?: string | string[] }
export type UseBuildUserOperationMutationArgs = BuildUserOperationArgs
export type UseBuildUserOperationConfig = MutationConfig<
  BuildUserOperationResult,
  Error,
  UseBuildUserOperationArgs
>

type BuildUserOperationFn = (
  overrideConfig?: UseBuildUserOperationMutationArgs,
) => void
type BuildUserOperationAsyncFn = (
  overrideConfig?: UseBuildUserOperationMutationArgs,
) => Promise<BuildUserOperationResult>
type MutateFnReturnValue<TMode, TFn> = TMode extends 'prepared'
  ? TFn | undefined
  : TFn

export const mutationKey = (args: UseBuildUserOperationArgs) =>
  [{ entity: 'buildUserOperation', ...args }] as const

const mutationFn = ({
  account,
  chainId,
  data,
  mode,
  to,
  value,
}: UseBuildUserOperationArgs) => {
  if (!to) throw new Error('to is required.')
  return buildUserOperation({
    account,
    chainId,
    data,
    mode,
    to,
    value,
  })
}

/**
 * @description Hook for building a transaction.
 *
 * It is recommended to pair this with the [`usePrepareBuildUserOperation` hook](/docs/prepare-hooks/usePrepareBuildUserOperation)
 * to [avoid UX pitfalls](https://wagmi.sh/react/prepare-hooks#ux-pitfalls-without-prepare-hooks).
 *
 * @example
 * import { useBuildUserOperation, usePrepareBuildUserOperation } from '@zerodev/wagmi'
 *
 * const config = usePrepareBuildUserOperation({
 *   request: {
 *     to: 'moxey.eth',
 *     value: parseEther('1'),
 *   }
 * })
 * const result = useBuildUserOperation(config)
 */
export function useBuildUserOperation<
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
}: UseBuildUserOperationArgs<TMode> & UseBuildUserOperationConfig = {}) {
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

  const buildUserOperation = React.useCallback(
    (args?: UseBuildUserOperationMutationArgs) =>
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

  const buildUserOperationAsync = React.useCallback(
    (args?: UseBuildUserOperationMutationArgs) =>
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
    buildUserOperation: (mode === 'prepared' && !to
      ? undefined
      : buildUserOperation) as MutateFnReturnValue<TMode, BuildUserOperationFn>,
    buildUserOperationAsync: (mode === 'prepared' && !to
      ? undefined
      : buildUserOperationAsync) as MutateFnReturnValue<
      TMode,
      BuildUserOperationAsyncFn
    >,
    status,
    variables,
  }
}