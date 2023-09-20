import { Chain } from "wagmi";
import { AbstractWeb3AuthWalletConnectorOptions } from "../../../connectors/AbstractWeb3AuthWalletConnector.js";
import { DiscordSocialWalletConnector } from "../../../connectors/DiscordSocialWalletConnector.js";
import { Wallet } from "./wallet.js";

export function discordWallet({chains, options}: {chains?: Chain[], options: AbstractWeb3AuthWalletConnectorOptions}): Wallet{
    return {
        iconBackground: '#fff',
        iconUrl: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/91_Discord_logo_logos-512.png',
        id: 'openlogin_discord',

        name: 'Discord',
        createConnector: function (){
            return {connector: new DiscordSocialWalletConnector({chains, options})}
        }
    }
}