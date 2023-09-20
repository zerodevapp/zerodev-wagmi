import { Chain } from "wagmi";
import { AbstractWeb3AuthWalletConnectorOptions } from "../../../connectors/AbstractWeb3AuthWalletConnector.js";
import { TwitterSocialWalletConnector } from "../../../connectors/TwitterSocialWalletConnector.js";
import { Wallet } from "./wallet.js";

export function twitterWallet({chains, options}: {chains?: Chain[], options: AbstractWeb3AuthWalletConnectorOptions}): Wallet{
    return {
        iconBackground: '#fff',
        iconUrl:
            'https://cdn3.iconfinder.com/data/icons/inficons/512/twitter.png',
        id: 'openlogin_twitter',
        name: 'Twitter',
        createConnector: function (){
            return {connector: new TwitterSocialWalletConnector({chains, options})}
        }
    }
}