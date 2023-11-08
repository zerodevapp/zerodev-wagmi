import { useWalletClient } from 'wagmi';
import { ECDSAProvider } from '@zerodev/sdk';

export const useEcdsaProvider = () => {
    const { data: walletClient } = useWalletClient();

    if (!walletClient) {
        return null;
    }

    // @ts-expect-error
    const ecdsaProvider = walletClient.ecdsaProvider;
    return ecdsaProvider as ECDSAProvider;
};

