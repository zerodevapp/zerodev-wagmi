import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider } from '@zerodevapp/web3auth'

export class FacebookSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'facebook'
    name = 'Facebook'
    loginProvider = 'facebook' as LoginProvider
}