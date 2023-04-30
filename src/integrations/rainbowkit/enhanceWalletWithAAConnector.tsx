import { type Wallet } from "./wallets/wallet";
import { enhanceConnectorWithAA } from '../../utilities/enhanceConnectorWithAA';
import { type AccountParams } from '../../connectors/ZeroDevConnector'

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