import { Chain } from "wagmi";
import { AbstractWeb3AuthWalletConnectorOptions } from "../../../connectors/AbstractWeb3AuthWalletConnector";
import { DiscordSocialWalletConnector } from "../../../connectors/DiscordSocialWalletConnector";
import { Wallet } from "./wallet";

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