

import type {
  Abi,
  AbiEvent,
  AbiFunction,
  AbiParameter,
  AbiParameterToPrimitiveType,
  AbiParametersToPrimitiveTypes,
  AbiStateMutability,
  Address,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
  Narrow,
  ResolvedConfig,
} from 'abitype'

import type {
    QueryFunctionContext,
    UseMutationOptions,
    UseQueryOptions,
} from '@tanstack/react-query'
import { ethers } from 'ethers'

/**
 * Makes {@link TKeys} optional in {@link TType} while preserving type inference.
 */
// s/o trpc (https://github.com/trpc/trpc/blob/main/packages/server/src/types.ts#L6)
export type PartialBy<TType, TKeys extends keyof TType> = Partial<Pick<TType, TKeys>> & Omit<TType, TKeys>


export type QueryFunctionArgs<T extends (...args: any) => any> = QueryFunctionContext<ReturnType<T>>

export type QueryConfig<TData, TError, TSelectData = TData> = Pick<
  UseQueryOptions<TData, TError, TSelectData>,
  | 'cacheTime'
  | 'enabled'
  | 'isDataEqual'
  | 'keepPreviousData'
  | 'select'
  | 'staleTime'
  | 'structuralSharing'
  | 'suspense'
  | 'onError'
  | 'onSettled'
  | 'onSuccess'
> & {
  /** Scope the cache to a given context. */
  scopeKey?: string
}

export type MutationConfig<Data, Error, Variables = void> = {
    /** Function fires if mutation encounters error */
    onError?: UseMutationOptions<Data, Error, Variables>['onError']
    /**
     * Function fires before mutation function and is passed same variables mutation function would receive.
     * Value returned from this function will be passed to both onError and onSettled functions in event of a mutation failure.
     */
    onMutate?: UseMutationOptions<Data, Error, Variables>['onMutate']
    /** Function fires when mutation is either successfully fetched or encounters error */
    onSettled?: UseMutationOptions<Data, Error, Variables>['onSettled']
    /** Function fires when mutation is successful and will be passed the mutation's result */
    onSuccess?: UseMutationOptions<Data, Error, Variables>['onSuccess']
}


export type GetFunctionName<
  TAbi extends Abi | readonly unknown[] = Abi,
  TFunctionName extends string = string,
  TAbiStateMutability extends AbiStateMutability = AbiStateMutability,
> = TAbi extends Abi
  ? ExtractAbiFunctionNames<
      TAbi,
      TAbiStateMutability
    > extends infer AbiFunctionNames
    ?
        | AbiFunctionNames
        | (TFunctionName extends AbiFunctionNames ? TFunctionName : never)
        | (Abi extends TAbi ? string : never)
    : never
  : TFunctionName

export type GetArgs<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TAbiFunction extends AbiFunction & { type: 'function' } = TAbi extends Abi
    ? ExtractAbiFunction<TAbi, TFunctionName>
    : AbiFunction & { type: 'function' },
  TArgs = AbiParametersToPrimitiveTypes<TAbiFunction['inputs']>,
  FailedToParseArgs =
    | ([TArgs] extends [never] ? true : false)
    | (readonly unknown[] extends TArgs ? true : false),
> = true extends FailedToParseArgs
  ? {
      /**
       * Arguments to pass contract method
       *
       * Use a [const assertion](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions) on {@link abi} for type inference.
       */
      args?: readonly unknown[]
    }
  : TArgs extends readonly []
  ? { args?: never }
  : {
      /** Arguments to pass contract method */ args: TArgs
    }

    export type GetOverridesForAbiStateMutability<
    TAbiStateMutability extends AbiStateMutability,
  > = {
    nonpayable: Overrides & { from?: Address }
    payable: PayableOverrides & { from?: Address }
    pure: CallOverrides
    view: CallOverrides
  }[TAbiStateMutability]
  
  // Update `ethers.Overrides` to use abitype config
  export interface Overrides extends ethers.Overrides {
    gasLimit?: ResolvedConfig['BigIntType']
    gasPrice?: ResolvedConfig['BigIntType']
    maxFeePerGas?: ResolvedConfig['BigIntType']
    maxPriorityFeePerGas?: ResolvedConfig['BigIntType']
    nonce?: ResolvedConfig['IntType']
  }
  
  // Update `ethers.PayableOverrides` to use abitype config
  export interface PayableOverrides extends Overrides {
    value?: ResolvedConfig['IntType'] | ResolvedConfig['BigIntType']
  }
  
  // Update `ethers.CallOverrides` to use abitype config
  export interface CallOverrides extends PayableOverrides {
    blockTag?: ethers.CallOverrides['blockTag']
    from?: Address
  } 