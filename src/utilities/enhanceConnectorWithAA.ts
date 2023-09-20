import { Connector, Address } from 'wagmi';
import { ECDSAProvider, ZeroDevProvider, convertWalletClientToAccountSigner, getRPCProviderOwner } from '@zerodev/sdk';
import { AccountParams } from '../connectors/ZeroDevConnector.js';
import { ZeroDevApiService } from '../services/ZeroDevApiService.js';
import { Chain, createWalletClient, custom } from 'viem';

export const enhanceConnectorWithAA = (connector: Connector, params: Omit<AccountParams, "owner">) => {
    let provider: ZeroDevProvider | null = null
    let walletClient: any | null = null
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
                        // case 'switchChain':
                        //     console.log(source)
                        //     return source
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
                                const chainId = await receiver.getChainId()
                                const chain = connector.chains.find(c => c.id === chainId)
                                if (!chain) throw new Error('missing chain')
                                provider = await ECDSAProvider.init({
                                    projectId: params.projectId,
                                    owner: getRPCProviderOwner(source),
                                    opts: {
                                        paymasterConfig: {
                                            policy: "VERIFYING_PAYMASTER"
                                        }
                                    }
                                })
                            }
                            return provider
                        case 'getWalletClient':
                            if (!walletClient) {
                                if (!provider) throw new Error('provider is required')
                                const chainId = await receiver.getChainId()
                                const chain = receiver.chains.find((chain: Chain) => chain.id === chainId)
                                walletClient = createWalletClient({
                                    account: await receiver.getAccount(),
                                    chain,
                                    transport: custom(provider)
                                })
                                walletClient.sendUserOperation = provider.sendUserOperation.bind(provider)
                                walletClient.waitForUserOperationTransaction = provider.waitForUserOperationTransaction.bind(provider)
                            }
                            return walletClient
                        case 'getAccount':
                            return await (await receiver.getProvider()).getAddress() as Address
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