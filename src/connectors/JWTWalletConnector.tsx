import { Chain } from 'wagmi'
import { AbstractWeb3AuthWalletConnector, AbstractWeb3AuthWalletConnectorOptions } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider, ZeroDevWeb3Auth } from '@zerodevapp/web3auth'
import { ChainId } from '@zerodevapp/web3auth/dist/types'
import { getClient } from '@wagmi/core'
import { getRPCProviderOwner } from '@zerodevapp/sdk'

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
            if (!provider) {
                getClient().storage?.setItem(`${this.loginProvider}-connecting`, true)
                provider = await this.web3Auth?.connect(this.loginProvider, {jwt: this.jwt})
                setTimeout(() => {
                    getClient().storage?.setItem(`${this.loginProvider}-connecting`, false)
                }, 1000)
            }
            this.owner = getRPCProviderOwner(provider)
        }
        return await super.connect({ chainId })
    }
}