import { AccountParams, ZeroDevConnector } from "./ZeroDevConnector";
import { ZeroDevWeb3Auth, type ZeroDevWeb3AuthOptions, type LoginProvider, type ZeroDevWeb3AuthInitOptions } from '@zerodevapp/web3auth'
import { getRPCProviderOwner } from '@zerodevapp/sdk';
import { Signer, getClient } from '@wagmi/core';
import type { Chain } from 'wagmi/chains';
import { connect } from 'wagmi/actions'
import { ChainId } from "@zerodevapp/web3auth/dist/types";

export type AbstractWeb3AuthWalletConnectorOptions = Omit<Partial<AccountParams>, "owner" | "disconnect"> & Partial<ZeroDevWeb3AuthOptions>

export abstract class AbstractWeb3AuthWalletConnector extends ZeroDevConnector<AbstractWeb3AuthWalletConnectorOptions> {
    abstract loginProvider: LoginProvider
    owner: Signer | undefined;
    web3Auth: ZeroDevWeb3Auth | undefined
    
    constructor(
        {chains = [], options}: {chains?: Chain[]; options: AbstractWeb3AuthWalletConnectorOptions},
    ) {
        super({chains, options})
        this.getChainId().then(chainId => {
            if (this.options.projectIds) {
                const web3AuthInitOptions: ZeroDevWeb3AuthInitOptions = {}
                this.web3Auth = ZeroDevWeb3Auth.getInstance(this.options.projectIds, chainId as ChainId, {
                    adapterSettings: options.adapterSettings,
                    web3authOptions: options.web3authOptions
                })
                if (
                    getClient().storage?.getItem(`${this.loginProvider}-connecting`)
                    ||
                    (options.shimDisconnect && getClient().storage?.getItem(this.shimDisconnectKey))
                ) {
                    web3AuthInitOptions['onConnect'] = async (userInfo: any) => {
                        if (this.loginProvider === userInfo.typeOfLogin)  {
                            if (this.web3Auth?.provider) {
                                this.owner = getRPCProviderOwner(this.web3Auth?.provider)
                            }
                            connect(({chainId, connector: this}))
                        }
                        getClient().storage?.setItem(`${this.loginProvider}-connecting`, false)
                    }
                }
                this.web3Auth.initialize(web3AuthInitOptions, this.loginProvider)
            }
        }).catch(e => {
            console.log(e);
        })
    }

    async isAuthorized() {
        return false
    }

    async connect({ chainId }: { chainId: ChainId }) {
        if (!this.owner) {
            let provider = this.web3Auth?.provider
            if (this.web3Auth?.status === 'connected' && (await this.web3Auth?.getUserInfo())?.typeOfLogin !== this.loginProvider) {
                await this.web3Auth?.logout()
                provider = null
            }
            if (!this.web3Auth?.connected) {
                getClient().storage?.setItem(`${this.loginProvider}-connecting`, true)
                provider = await this.web3Auth?.login(this.loginProvider)
                setTimeout(() => {
                    getClient().storage?.setItem(`${this.loginProvider}-connecting`, false)
                }, 1000)
            }
            if (provider) {
                this.owner = getRPCProviderOwner(provider)
            }
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