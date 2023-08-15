import { AccountParams, ZeroDevConnector } from "./ZeroDevConnector";
import { ZeroDevWeb3Auth, type ZeroDevWeb3AuthOptions, type LoginProvider, type ZeroDevWeb3AuthInitOptions } from '@zerodev/web3auth'
import { getConfig } from '@wagmi/core';
import type { Chain } from 'wagmi/chains';
import { connect } from 'wagmi/actions'
import { SmartAccountSigner } from "@alchemy/aa-core";
import { createWalletClient, custom } from "viem";
import { convertWalletClientToAccountSigner } from '@zerodev/sdk'

export type AbstractWeb3AuthWalletConnectorOptions = Omit<Partial<AccountParams>, "owner" | "disconnect"> & Partial<ZeroDevWeb3AuthOptions>

export abstract class AbstractWeb3AuthWalletConnector extends ZeroDevConnector {
    abstract loginProvider: LoginProvider
    owner: SmartAccountSigner | undefined;
    web3Auth: typeof ZeroDevWeb3Auth | undefined
    
    constructor(
        {chains = [], options}: {chains?: Chain[]; options: AbstractWeb3AuthWalletConnectorOptions},
    ) {
        super({chains, options})
        this.getChainId().then(chainId => {
            if (this.options.projectIds) {
                const web3AuthInitOptions: ZeroDevWeb3AuthInitOptions = {}
                this.web3Auth = new ZeroDevWeb3Auth(this.options.projectIds, chainId, {
                    adapterSettings: options.adapterSettings,
                    web3authOptions: options.web3authOptions
                })
                if (
                    getConfig().storage?.getItem(`${this.loginProvider}-connecting`)
                    ||
                    (options.shimDisconnect && getConfig().storage?.getItem(this.shimDisconnectKey))
                ) {
                    web3AuthInitOptions['onConnect'] = async (userInfo: any) => {
                        if (this.loginProvider === userInfo.typeOfLogin)  {
                            this.owner = this.web3Auth.provider
                            connect(({chainId, connector: this}))
                        }
                        getConfig().storage?.setItem(`${this.loginProvider}-connecting`, false)
                    }
                }
                this.web3Auth.init(web3AuthInitOptions, this.loginProvider)
            }
        })
    }

    async isAuthorized() {
        return false
        let provider = this.web3Auth?.provider
        if (!provider && ((await this.getOptions()).shimDisconnect || getConfig().storage?.getItem(this.shimDisconnectKey))) {
            provider = await this.web3Auth?.connect(this.loginProvider)
        }
        if (provider) {
            this.owner = provider
        }
        return super.isAuthorized()
    }

    //@ts-expect-error
    async connect({ chainId }) {
        if (!this.owner) {
            let provider = this.web3Auth?.provider
            if (this.web3Auth?.status === 'connected' && (await this.web3Auth?.getUserInfo())?.typeOfLogin !== this.loginProvider) {
                await this.web3Auth?.logout()
                provider = null
            }
            if (!provider) {
                getConfig().storage?.setItem(`${this.loginProvider}-connecting`, true)
                provider = await this.web3Auth?.connect(this.loginProvider)
                setTimeout(() => {
                    getConfig().storage?.setItem(`${this.loginProvider}-connecting`, false)
                }, 1000)
            }
            const walletClient = createWalletClient({
                chain: await this.getChain(),
                transport: custom(provider)
            })
            const address = (await walletClient.getAddresses())[0]
            this.owner = {
                getAddress: async () => address,
                signMessage: async (message: string | Uint8Array) =>  {
                    return walletClient.signMessage({
                        account: address, 
                        message: typeof message === 'string' ? message : {raw: message}
                    })
                }
            }
            // const walletClient = createWalletClient({
            //     chain: await this.getChain(),
            //     transport: custom(provider)
            // })
            // this.owner = convertWalletClientToAccountSigner(walletClient)
        }
        return await super.connect({ chainId })
    }

    async getOptions() {
        if (this.owner) {
            this.options.owner = this.owner
        }
        const options = await super.getOptions()
        options.disconnect = async () => {
            await this.web3Auth?.logout()
            this.owner = undefined
        }
        return options
    }
}