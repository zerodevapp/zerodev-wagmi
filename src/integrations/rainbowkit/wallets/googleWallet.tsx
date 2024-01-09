import { Chain } from "wagmi";
import { AbstractWeb3AuthWalletConnectorOptions } from "../../../connectors/AbstractWeb3AuthWalletConnector.js";
import { GoogleSocialWalletConnector } from "../../../connectors/GoogleSocialWalletConnector.js";
import { Wallet } from "./wallet.js";

export function googleWallet({chains, options}: {chains?: Chain[], options: AbstractWeb3AuthWalletConnectorOptions}): Wallet {
    return {
        iconBackground: '#fff',
        iconUrl:
            'https://cdn1.iconfinder.com/data/icons/google-new-logos-1/32/gmail_new_logo-512.png',
        id: 'openlogin_google',
        name: 'Google',
        createConnector: () => {
            return {connector: new GoogleSocialWalletConnector({chains, options})}
        }
    }
}