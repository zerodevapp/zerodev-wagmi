import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider } from '@zerodevapp/web3auth'

export class GithubSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'github'
    name = 'Github'
    loginProvider = 'github' as LoginProvider
}