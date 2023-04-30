import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider } from '@zerodevapp/web3auth'

export class TwitterSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'twitter'
    name = 'Twitter'
    loginProvider = 'twitter' as LoginProvider
}