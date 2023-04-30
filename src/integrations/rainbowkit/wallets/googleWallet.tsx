import { Chain } from "wagmi";
import { AbstractWeb3AuthWalletConnectorOptions } from "../../../connectors/AbstractWeb3AuthWalletConnector";
import { GoogleSocialWalletConnector } from "../../../connectors/GoogleSocialWalletConnector";
import { Wallet } from "./wallet";

export function googleWallet({chains, options}: {chains?: Chain[], options: AbstractWeb3AuthWalletConnectorOptions}): Wallet{
    return {
        iconBackground: '#fff',
        iconUrl:
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/2048px-Google_%22G%22_Logo.svg.png',
        id: 'openlogin_google',
        name: 'Google',
        createConnector: () => {
            return {connector: new GoogleSocialWalletConnector({chains, options})}
        }
    }
}