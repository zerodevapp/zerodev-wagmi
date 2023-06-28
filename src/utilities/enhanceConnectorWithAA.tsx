import { Connector, Address } from 'wagmi';
import { getZeroDevProvider, getRPCProviderOwner, ZeroDevProvider} from '@zerodevapp/sdk';
import { AccountParams } from '../connectors/ZeroDevConnector';
import { ZeroDevApiService } from '../services/ZeroDevApiService';

export const enhanceConnectorWithAA = (connector: Connector, params: Omit<AccountParams, "owner">) => {
    let provider: ZeroDevProvider | null = null
    let _wallets: any[]
    const enhancedConnector= new Proxy(connector, {
        set(target, prop, value, receiver) {
            if (prop === '_wallets') {
                return _wallets = value
            }
            return Reflect.set(target, prop, value, receiver)
        },
        get(target, prop, receiver){
            if (prop === '_wallets') return _wallets
            if (prop === "switchChain") return undefined
            let value = target[prop as keyof Connector];
            if (prop === 'id') value += '-zerodev'
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
                                provider = await getZeroDevProvider({
                                    ...params,
                                    owner: getRPCProviderOwner(source),
                                });
                            }
                            return provider
                        case 'getSigner':
                            return await (await receiver.getProvider()).getSigner()
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