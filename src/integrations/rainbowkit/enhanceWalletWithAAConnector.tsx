import { type Wallet } from "./wallets/wallet.js";
import { enhanceConnectorWithAA } from '../../utilities/enhanceConnectorWithAA.js';
import { type AccountParams } from '../../connectors/ZeroDevConnector.js'

export const enhanceWalletWithAAConnector = (wallet: Wallet, params: Omit<AccountParams, 'owner'>) => {
    return new Proxy(wallet, {
        get(target, prop, receiver) {
            const source = Reflect.get(target, prop, receiver)
            if (prop === "createConnector") {
                return () => {
                    const result = source()
                    return {
                        ...result,
                        connector: enhanceConnectorWithAA(result["connector"], params)
                    }
                }
            }
            return source
        }
    })

}