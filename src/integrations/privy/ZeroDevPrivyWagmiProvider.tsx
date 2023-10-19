import React, { useMemo } from 'react';
import { configureChains } from "wagmi";
import { AccountParams } from "../../connectors/ZeroDevConnector";
import { PrivyConnector, PrivyWagmiConnector } from "@privy-io/wagmi-connector";
import { usePrivy } from '@privy-io/react-auth';
import { ZeroDevPrivyConnector } from './ZeroDevPrivyConnector';
export type ConfigureChainsReturnType = ReturnType<typeof configureChains>;
​
type ZeroDevPrivyOptions = {
    // Defaults to true
    useSmartWalletForExternalEOA: boolean;
} & Omit<AccountParams, 'owner'>;
​
export interface ZeroDevPrivyWagmiProviderProps {
    children: React.ReactNode;
    wagmiChainsConfig: ConfigureChainsReturnType;
    options: ZeroDevPrivyOptions;
}
​
export const ZeroDevPrivyWagmiProvider: React.FC<ZeroDevPrivyWagmiProviderProps> = ({options, wagmiChainsConfig, children}) => {
    const {ready, authenticated, user, logout} = usePrivy();
    const {chains} = wagmiChainsConfig;
    const hasEmbeddedWallet = user && user.linkedAccounts.find((account) => account.type === 'wallet' && account.walletClientType === 'privy');
    const connector = useMemo(() => {
        if (!ready) return;
​
        if (!hasEmbeddedWallet && options.useSmartWalletForExternalEOA === false) {
            // If the user has no embedded wallet, and using smart wallets for external EOAs
            // is disabled, return the regular PrivyConnector to connect wagmi to the EOA
            return new PrivyConnector({logout, chains});
        } else {
            // Otherwise, return the ZeroDevPrivyConnector to connect wagmi to the smart wallet
            return new ZeroDevPrivyConnector({logout, chains, options});
        }
    }, [ready, authenticated, hasEmbeddedWallet, chains, options.useSmartWalletForExternalEOA]);
​
    return (
    <PrivyWagmiConnector wagmiChainsConfig={wagmiChainsConfig} privyConnectorOverride={connector}>
        {children}
    </PrivyWagmiConnector>
  );
}
