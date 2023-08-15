import { AbstractWeb3AuthWalletConnector } from './AbstractWeb3AuthWalletConnector'
import { LoginProvider } from '@zerodev/web3auth'

export class DiscordSocialWalletConnector extends AbstractWeb3AuthWalletConnector {
    id = 'discord'
    name = 'Discord'
    loginProvider = 'discord' as LoginProvider
}