import { AccountParams, ZeroDevConnector } from "./ZeroDevConnector";
import { ZeroDevWeb3Auth, ExtendedWeb3Auth, ExtendedWeb3AuthInitOptions, LoginProvider } from '@zerodevapp/web3auth'
import { getRPCProviderOwner } from '@zerodevapp/sdk';
import { Signer, getClient } from '@wagmi/core';
import type { Chain } from 'wagmi/chains';
import { connect } from 'wagmi/actions'
import { ChainId } from "@zerodevapp/web3auth/dist/types";
import { OpenloginAdapterOptions } from "@web3auth/openlogin-adapter";

export type AbstractWeb3AuthWalletConnectorOptions = Omit<Partial<AccountParams>, "owner" | "disconnect"> & {adapterSettings?: OpenloginAdapterOptions['adapterSettings']}

export abstract class AbstractWeb3AuthWalletConnector extends ZeroDevConnector<AbstractWeb3AuthWalletConnectorOptions> {
    abstract loginProvider: LoginProvider
    owner: Signer | undefined;
    web3Auth: ExtendedWeb3Auth | undefined
    
    constructor(
        {chains = [], options}: {chains?: Chain[]; options: AbstractWeb3AuthWalletConnectorOptions},
    ) {
        super({chains, options})
        this.getChainId().then(chainId => {
            if (this.options.projectIds) {
                this.web3Auth = new ZeroDevWeb3Auth(this.options.projectIds, chainId as ChainId)
                const web3AuthInitOptions: ExtendedWeb3AuthInitOptions = {
                    adapterSettings: options.adapterSettings
                }
                if (
                    getClient().storage?.getItem(`${this.loginProvider}-connecting`)
                    ||
                    (options.shimDisconnect && getClient().storage?.getItem(this.shimDisconnectKey))
                ) {
                    web3AuthInitOptions['onConnect'] = async (userInfo: any) => {
                        if (this.loginProvider === userInfo.typeOfLogin)  {
                            this.owner = getRPCProviderOwner(this.web3Auth?.provider)
                            connect(({chainId, connector: this}))
                        }
                        getClient().storage?.setItem(`${this.loginProvider}-connecting`, false)
                    }
                }
                this.web3Auth.init(web3AuthInitOptions)
            }
        })
    }

    async isAuthorized() {
        return false
        let provider = this.web3Auth?.provider
        if (!provider && ((await this.getOptions()).shimDisconnect || getClient().storage?.getItem(this.shimDisconnectKey))) {
            provider = await this.web3Auth?.connect(this.loginProvider)
        }
        if (provider) {
            this.owner = getRPCProviderOwner(provider)
        }
        return super.isAuthorized()
    }

    async connect({ chainId }: { chainId: ChainId }) {
        if (!this.owner) {
            let provider = this.web3Auth?.provider
            if (this.web3Auth?.status === 'connected' && (await this.web3Auth?.getUserInfo())?.typeOfLogin !== this.loginProvider) {
                await this.web3Auth?.logout()
                provider = null
            }
            if (!provider) {
                getClient().storage?.setItem(`${this.loginProvider}-connecting`, true)
                provider = await this.web3Auth?.connect(this.loginProvider)
            }
            this.owner = getRPCProviderOwner(provider)
        }
        return await super.connect({ chainId })
    }

    async getOptions() {
        const options = await super.getOptions()
        options.disconnect = async () => {
            await this.web3Auth?.logout()
            this.owner = undefined
        }
        if (this.owner) {
            options.owner = this.owner
        }
        return options
    }
}