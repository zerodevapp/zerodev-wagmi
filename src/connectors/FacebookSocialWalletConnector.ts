import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector.js'
import { LoginProvider } from '@zerodev/web3auth'

export class FacebookSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'facebook'
    name = 'Facebook'
    loginProvider = 'facebook' as LoginProvider
}