import React, { useMemo } from 'react';
import { configureChains } from "wagmi";
import { AccountParams } from "../../connectors/ZeroDevConnector";
import { PrivyWagmiConnector } from "@privy-io/wagmi-connector";
import { usePrivy } from '@privy-io/react-auth';
import { ZeroDevPrivyConnector } from './ZeroDevPrivyConnector';
export type ConfigureChainsReturnType = ReturnType<typeof configureChains>;

export interface ZeroDevPrivyWagmiProviderProps {
    children: React.ReactNode;
    wagmiChainsConfig: ConfigureChainsReturnType;
    options: Omit<AccountParams, 'owner'>
}
export const ZeroDevPrivyWagmiProvider: React.FC<ZeroDevPrivyWagmiProviderProps> = ({options, wagmiChainsConfig, ...props}) => {
    const {logout} = usePrivy();
    const { chains } = wagmiChainsConfig;
    const connector = useMemo(() => new ZeroDevPrivyConnector({logout, chains, options}), [chains, logout])
    return <PrivyWagmiConnector wagmiChainsConfig={wagmiChainsConfig} {...props} privyConnectorOverride={connector} />
}