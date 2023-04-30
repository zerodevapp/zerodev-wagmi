import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider } from '@zerodevapp/web3auth'

export class Auth0WalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'auth0'
    name = 'Auth0'
    loginProvider = 'auth0' as LoginProvider
}