import { Chain } from 'wagmi'
import { AbstractWeb3AuthWalletConnector, AbstractWeb3AuthWalletConnectorOptions } from './AbstractWeb3AuthWalletConnector.js'
import { LoginProvider, ZeroDevWeb3Auth } from '@zerodev/web3auth'
import { ChainId } from '@zerodev/web3auth/dist/types'
import { getConfig } from '@wagmi/core'
import { getRPCProviderOwner } from '@zerodev/sdk'

interface JWTWalletConnectorOptions extends AbstractWeb3AuthWalletConnectorOptions {
    jwt: string
}

export class JWTWalletConnector extends AbstractWeb3AuthWalletConnector {
    loginProvider = 'jwt' as LoginProvider
    id = 'jwt'
    name = 'JWT'
    jwt: string

    constructor({chains = [], options}: {chains?: Chain[]; options: JWTWalletConnectorOptions}) {
        super({chains, options})
        this.jwt = options.jwt
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
                provider = await this.web3Auth?.login(this.loginProvider, {jwt: this.jwt})
                setTimeout(() => {
                    getConfig().storage?.setItem(`${this.loginProvider}-connecting`, false)
                }, 1000)
            }
            this.owner =  getRPCProviderOwner(provider)
        }
        return await super.connect({ chainId })
    }
}