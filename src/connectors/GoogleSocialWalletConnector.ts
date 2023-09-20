import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector.js'
import { LoginProvider } from '@zerodev/web3auth'

export class GoogleSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'google'
    name = 'Google'
    loginProvider = 'google' as LoginProvider
}