import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider } from '@zerodev/web3auth'

export class TwitchSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'twitch'
    name = 'Twitch'
    loginProvider = 'twitch' as LoginProvider
}