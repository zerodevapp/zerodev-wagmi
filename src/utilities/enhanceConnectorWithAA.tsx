import { Connector, Address } from 'wagmi';
import { ECDSAValidator, KernelSmartContractAccount, ValidatorMode, ZeroDevProvider} from '@zerodevapp/sdk';
import { AccountParams } from '../connectors/ZeroDevConnector';
import { ZeroDevApiService } from '../services/ZeroDevApiService';
import { createWalletClient, custom } from 'viem';

export const enhanceConnectorWithAA = (connector: Connector, params: Omit<AccountParams, "owner">) => {
    let provider: ZeroDevProvider | null = null
    let walletClient: any | null = null
    const enhancedConnector= new Proxy(connector, {
        get(target, prop, receiver){
            if (prop === "switchChain") return undefined
            const value = target[prop as keyof Connector];
            if (value instanceof Function) {
                return async function (...args: any) {
                    const source = await value.apply(target, args)
                    switch (prop) {
                        case 'connect':
                            return {
                                ...source,
                                account: await receiver.getAccount()
                            }
                        case 'getChainId':
                            if (provider === null) {
                                const response = await ZeroDevApiService.getProjectConfiguration(params.projectId)
                                return response["chainId"]
                            }
                            return (await receiver.getProvider()).chainId
                        case 'getProvider':
                            if (provider === null) {
                                const address = await source.getAddress()
                                const owner = {
                                    getAddress: async () => address,
                                    signMessage: async (message: string | Uint8Array) =>  {
                                        return source.getSigner().signMessage({
                                            account: address, 
                                            message: typeof message === 'string' ? message : {raw: message}
                                        })
                                    }
                                }
                                const chainId = await receiver.getChainId()
                                const chain = connector.chains.find(c => c.id === chainId)
                                if (!chain) throw new Error('missing chain')
                                const validator = params.validator ? params.validator(owner, chain) : new ECDSAValidator(({
                                    validatorAddress: "0x180D6465F921C7E0DEA0040107D342c87455fFF5",
                                    mode: ValidatorMode.sudo,
                                    owner,
                                    chain,
                                    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
                                }))
                                provider = new ZeroDevProvider({
                                    projectId: params.projectId,
                                    chain: await connector.getChainId(),
                                    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
                                }).connect((rpcClient) => new KernelSmartContractAccount({
                                    owner,
                                    index: BigInt(0),
                                    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
                                    factoryAddress: '0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39',
                                    validator,
                                    defaultValidator: validator,
                                    rpcClient,
                                    chain
                                }))
                            }
                            return provider
                        case 'getWalletClient':
                            if (!walletClient) {
                                if (!provider) throw new Error('provider is required')
                                walletClient = createWalletClient({
                                    account: await receiver.getAccount(),
                                    chain: await receiver.getChain(),
                                    transport: custom(provider)
                                })
                            }
                            return walletClient
                        case 'getAccount':
                            return await (await receiver.getSigner()).getAddress() as Address
                        case 'disconnect':
                            provider = null

                        default:
                            return source
                    }
                };
            }
            return value
        }
    })

    const onAccountsChanged = enhancedConnector["onAccountsChanged"]
    enhancedConnector["onAccountsChanged"] = () => {
        provider = null
        enhancedConnector.getAccount().then(account => onAccountsChanged([account]))
    }
    enhancedConnector["onChainChanged"] = () => {}
    const onDisconnect = enhancedConnector["onDisconnect"]
    enhancedConnector["onDisconnect"] = (error: Error) => {
        provider = null
        onDisconnect(error)
    }

    return enhancedConnector
}