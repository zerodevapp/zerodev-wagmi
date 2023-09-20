import { Chain } from "wagmi";
import { AbstractWeb3AuthWalletConnectorOptions } from "../../../connectors/AbstractWeb3AuthWalletConnector.js";
import { TwitchSocialWalletConnector } from "../../../connectors/TwitchSocialWalletConnector.js";
import { Wallet } from "./wallet.js";

export function twitchWallet({chains, options}: {chains?: Chain[], options: AbstractWeb3AuthWalletConnectorOptions}): Wallet{
    return {
        iconBackground: '#fff',
        iconUrl:
            'https://cdn4.iconfinder.com/data/icons/logos-brands-7/512/twitch-1024.png',
        id: 'openlogin_twitch',

        name: 'Twitch',
        createConnector: function (){
            return {connector: new TwitchSocialWalletConnector({chains, options})}
        }
    }
}