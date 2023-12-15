import React, { useMemo } from 'react';
import { configureChains } from "wagmi";
import { AccountParams } from "../../connectors/ZeroDevConnector";
import { PrivyWagmiConnector } from "@privy-io/wagmi-connector";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ZeroDevPrivyConnector } from './ZeroDevPrivyConnector';
export type ConfigureChainsReturnType = ReturnType<typeof configureChains>;

type ZeroDevPrivyOptions = {
    // Defaults to true
    useSmartWalletForExternalEOA: boolean;
} & Omit<AccountParams, 'owner'>;

export interface ZeroDevPrivyWagmiProviderProps {
    children: React.ReactNode;
    wagmiChainsConfig: ConfigureChainsReturnType;
    options: ZeroDevPrivyOptions;
}
​
export const ZeroDevPrivyWagmiProvider: React.FC<ZeroDevPrivyWagmiProviderProps> = ({options, wagmiChainsConfig, children}) => {
    const {ready, authenticated, user, logout} = usePrivy();
    const {wallets: eoaWallets} = useWallets();
    const {chains} = wagmiChainsConfig;
    const hasEmbeddedWallet = user && user.linkedAccounts.find((account) => account.type === 'wallet' && account.walletClientType === 'privy');
    const embeddedWallet = eoaWallets.find((wallet) => (wallet.walletClientType === 'privy'));

    const connector = useMemo(() => {
        if (!ready) return;

        if (hasEmbeddedWallet) {
            // If the user has an embedded wallet, return the ZeroDevPrivyConnector specifically initialized
            // with the active wallet set as the embedded wallet
            return new ZeroDevPrivyConnector({logout, chains, activeWallet: embeddedWallet, options});
        } else {
            // If the user does not have an embedded wallet, first check if the app would like to use smart wallets for non-embedded EOAs
            if (options.useSmartWalletForExternalEOA === false) {
                // If no smart wallets for external EOAs, return undefined. Downstream, this will default to the regular PrivyConnector
                return undefined;
            } else {
                // If they do want smart wallets for external EOAs, return the ZeroDevPrivyConnector with the active wallet set as the latest connected wallet
                return new ZeroDevPrivyConnector({logout, chains, activeWallet: eoaWallets[0], options});
            }
        }
    }, [ready, authenticated, hasEmbeddedWallet, chains, options.useSmartWalletForExternalEOA, embeddedWallet]);

    return (
    <PrivyWagmiConnector wagmiChainsConfig={wagmiChainsConfig} privyConnectorOverride={connector}>
        {children}
    </PrivyWagmiConnector>
  );
}