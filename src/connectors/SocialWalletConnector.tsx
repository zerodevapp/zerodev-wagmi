import { AccountParams, ZeroDevConnector } from "./ZeroDevConnector";
import { ZeroDevWeb3AuthWithModal, ZeroDevWeb3AuthInitOptions, ZeroDevWeb3AuthOptions } from '@zerodevapp/web3auth'
import { getRPCProviderOwner } from '@zerodevapp/sdk';
import { Signer, getClient } from '@wagmi/core';
import type { Chain } from 'wagmi/chains';
import { connect } from 'wagmi/actions'
import { ChainId } from "@zerodevapp/web3auth/dist/types";

export type SocialWalletConnectorOptions = Omit<Partial<AccountParams>, "owner" | "disconnect"> & Partial<ZeroDevWeb3AuthOptions>

export abstract class SocialWalletConnector extends ZeroDevConnector<SocialWalletConnectorOptions> {
    loginProvider = 'social'
    id = 'social'
    name = 'Social'
    owner: Signer | undefined;
    web3Auth: typeof ZeroDevWeb3AuthWithModal | undefined
    
    constructor({chains = [], options}: {chains?: Chain[]; options: SocialWalletConnectorOptions}) {
        super({chains, options})
        this.getChainId().then(chainId => {
            if (this.options.projectIds) {
                this.web3Auth = new ZeroDevWeb3AuthWithModal(this.options.projectIds, chainId as ChainId, {
                    adapterSettings: options.adapterSettings,
                    web3authOptions: options.web3authOptions
                })
                const web3AuthInitOptions: ZeroDevWeb3AuthInitOptions = {}
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
                provider = await this.web3Auth?.connect()
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