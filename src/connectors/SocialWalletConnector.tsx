import { AccountParams, ZeroDevConnector } from "./ZeroDevConnector";
import { ZeroDevWeb3AuthWithModal, ZeroDevWeb3AuthInitOptions, ZeroDevWeb3AuthOptions } from '@zerodev/web3auth'
import { getConfig } from '@wagmi/core';
import type { Chain } from 'wagmi/chains';
import { connect } from 'wagmi/actions'
import { ChainId } from "@zerodev/web3auth/dist/types";
import { SmartAccountSigner } from "@alchemy/aa-core";
import { getRPCProviderOwner } from "@zerodev/sdk";

export type SocialWalletConnectorOptions = Omit<Partial<AccountParams>, "owner" | "disconnect"> & Partial<ZeroDevWeb3AuthOptions>

export abstract class SocialWalletConnector extends ZeroDevConnector<SocialWalletConnectorOptions> {
    loginProvider = 'social'
    id = 'social'
    name = 'Social'
    owner: SmartAccountSigner | undefined;
    web3Auth: ZeroDevWeb3AuthWithModal | undefined
    
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
                    getConfig().storage?.getItem(`${this.loginProvider}-connecting`)
                    ||
                    (options.shimDisconnect && getConfig().storage?.getItem(this.shimDisconnectKey))
                ) {
                    web3AuthInitOptions['onConnect'] = async (userInfo: any) => {
                        if (this.loginProvider === userInfo.typeOfLogin)  {
                            if (this.web3Auth?.provider) this.owner = getRPCProviderOwner(this.web3Auth.provider)
                            connect(({chainId, connector: this}))
                        }
                        getConfig().storage?.setItem(`${this.loginProvider}-connecting`, false)
                    }
                }
                this.web3Auth.initialize(web3AuthInitOptions)
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
            if (!this.web3Auth?.connected) {
                getConfig().storage?.setItem(`${this.loginProvider}-connecting`, true)
                provider = await this.web3Auth?.login()
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