import { Connector, Address } from 'wagmi';
import { ECDSAProvider, ECDSAValidator, KernelSmartContractAccount, ValidatorMode, ZeroDevProvider} from '@zerodevapp/sdk';
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
                                provider = await ECDSAProvider.init({
                                    projectId: params.projectId,
                                    owner,
                                })
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