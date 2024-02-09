import React, { useEffect, useMemo, useState } from 'react';
import { configureChains } from "wagmi";
import { AccountParams } from "../../connectors/ZeroDevConnector";
import { PrivyWagmiConnector } from "@privy-io/wagmi-connector";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ZeroDevPrivyConnector } from './ZeroDevPrivyConnector';
import { Hex } from 'viem';
export type ConfigureChainsReturnType = ReturnType<typeof configureChains>;

type ZeroDevPrivyOptions = {
    // Defaults to true
    useSmartWalletForExternalEOA: boolean;
    // Defaults to false
    useRecoveredAccount?: boolean;
} & Omit<AccountParams, 'owner'>;

type KernelApiResponse = {
    chainId: number;
    id: string;
    kernel: Hex;
    owner: Hex;
    validatorAddress: Hex;
}[];

export interface ZeroDevPrivyWagmiProviderProps {
    children: React.ReactNode;
    wagmiChainsConfig: ConfigureChainsReturnType;
    options: ZeroDevPrivyOptions;
}

const KERNEL_API_URL = 'https://kernel-api.zerodev.app';

export const ZeroDevPrivyWagmiProvider: React.FC<ZeroDevPrivyWagmiProviderProps> = ({options, wagmiChainsConfig, children}) => {
    const { ready, authenticated, user, logout } = usePrivy();
    const { wallets: eoaWallets } = useWallets();
    const [data, setData] = useState<KernelApiResponse>();
    const [connectorKey, setConnectorKey] = useState(0);

    const { chains } = wagmiChainsConfig;
    const hasEmbeddedWallet = !!(user && user.linkedAccounts.find((account) => account.type === 'wallet' && account.walletClientType === 'privy'));
    const embeddedWallet = eoaWallets.find((wallet) => (wallet.walletClientType === 'privy'));
    const { useRecoveredAccount, useSmartWalletForExternalEOA } = options;
    const readyForConnector = ready && authenticated;

    const activeWallet = useMemo(() => {
        if (hasEmbeddedWallet) {
            // If the user has an embedded wallet, return the ZeroDevPrivyConnector specifically initialized
            // with the active wallet set as the embedded wallet
            return embeddedWallet;
        } else {
            return eoaWallets[0];
        }
    }, [hasEmbeddedWallet, embeddedWallet?.address, eoaWallets?.[0]?.address]);

    useEffect(() => {
        const getAddress = async () => {
            if (useRecoveredAccount && activeWallet?.address) {
                const url = `${KERNEL_API_URL}/accounts/by-owner?ownerAddress=${activeWallet.address}`;
            
                try {
                    const response = await fetch(url);
                    const data = (await response.json()) as KernelApiResponse;
                    if (data.length) {
                        setData(data);
                        return;
                    }
                    setData(undefined);
                } catch (error) {
                    setData(undefined);
                }
            }
        }
        getAddress();
    }, [useRecoveredAccount, activeWallet?.address]);
    
    const connector = useMemo(() => {
        if (!readyForConnector) return;

        // Check if the app would like to use smart wallets for non-embedded EOAs
        if (useSmartWalletForExternalEOA === false && !hasEmbeddedWallet) {
            // If no smart wallets for external EOAs, return undefined. Downstream, this will default to the regular PrivyConnector
            return undefined;
        } else {
            // If they do want smart wallets for external EOAs, return the ZeroDevPrivyConnector with the active wallet set as the latest connected wallet
            const kernelData = data?.[data.length - 1];
            setConnectorKey(connectorKey + 1);
            return new ZeroDevPrivyConnector({ logout, chains, activeWallet, options, kernelAddress: kernelData?.kernel });
        }
    }, [readyForConnector, chains, useSmartWalletForExternalEOA, activeWallet?.address, eoaWallets?.[0]?.address]);

    return (
    <PrivyWagmiConnector
        key={connectorKey}
        wagmiChainsConfig={wagmiChainsConfig}
        privyConnectorOverride={connector}
    >
        {children}
    </PrivyWagmiConnector>
  );
}