import { Hex, createWalletClient, custom } from 'viem';
import { PrivyConnector } from '@privy-io/wagmi-connector';
import { ECDSAProvider, getRPCProviderOwner } from '@zerodev/sdk'
import { WalletClient, Chain } from 'wagmi';
import { ConnectedWallet } from '@privy-io/react-auth';
import { AccountParams } from '../../connectors/ZeroDevConnector';
import { getProjectsConfiguration } from '../../utilities/getProjectsConfiguration';
import { ProjectConfiguration } from '../../types';

export class ZeroDevPrivyConnector extends PrivyConnector {
    ecdsaProvider: ECDSAProvider | undefined
    projectsConfiguration: Promise<ProjectConfiguration>
    chainIdProjectIdMap: {[key: number]: string} = {}
    kernelAddress?: Hex
    rpcUrl?: string

    constructor({
        logout,
        chains,
        activeWallet,
        options,
        kernelAddress,
    }: {
        logout: () => Promise<void>;
        chains?: Chain[];
        activeWallet?: ConnectedWallet;
        options: Omit<AccountParams, 'owner'>;
        kernelAddress?: Hex;
    }) {
        super({ logout, chains, activeWallet});
        if (!options?.projectId && !options?.projectIds) throw Error('Please provide a projectId or projectIds')
        if (!options.projectId && options.projectIds) options.projectId = options.projectIds[0]
        if (options.projectId && !options.projectIds) options.projectIds = [options.projectId]
        this.kernelAddress = kernelAddress
        this.projectsConfiguration = getProjectsConfiguration(options.projectIds!)
        this.rpcUrl = options.rpcUrl
    }

    async getProjectIdFromChainId(chainId: number) {
        if (!this.chainIdProjectIdMap[chainId]) {
            const projectId = (await this.projectsConfiguration).projects?.find(project => project.chainId === chainId)?.id
            if (projectId) {
                this.chainIdProjectIdMap[chainId] = projectId
            }
        }
        return this.chainIdProjectIdMap[chainId]
    }

    override async getAccount(): Promise<`0x${string}`> {
        return await (await this.getECDSAProvider()).getAddress()
    }

    override async switchChain(chainId: number) {
        return super.switchChain(chainId)
    }

    protected onChainChanged = (chainId: number | string) => {
        this.ecdsaProvider = undefined
        return super.onChainChanged(chainId)
    };

    protected onAccountsChanged = (accounts: string[]) => {
        this.ecdsaProvider = undefined
        return super.onAccountsChanged(accounts)
    }

    async getECDSAProvider() {
        if (!this.ecdsaProvider) {
            this.ecdsaProvider = await ECDSAProvider.init({
                projectId: await this.getProjectIdFromChainId(await this.getChainId()),
                owner: getRPCProviderOwner(await this.getProvider()),
                opts: {
                    providerConfig: {
                        rpcUrl: this.rpcUrl,
                    },
                    validatorConfig: {
                        rpcUrl: this.rpcUrl,
                    },
                    accountConfig: {
                        accountAddress: this.kernelAddress,
                    },
                }
            });
        }
        return this.ecdsaProvider
    }

    override async getWalletClient({chainId}: {chainId?: number} = {}): Promise<WalletClient> {
        const chain = this.chains.find((x) => x.id === chainId);

        const ecdsaProvider = await this.getECDSAProvider();
        const walletClient = createWalletClient({
            account: await this.getAccount(),
            chain,
            transport: custom(ecdsaProvider),
        });
        // @ts-expect-error
        walletClient.sendUserOperation = ecdsaProvider.sendUserOperation.bind(ecdsaProvider)
        // @ts-expect-error
        walletClient.waitForUserOperationTransaction = ecdsaProvider.waitForUserOperationTransaction.bind(ecdsaProvider)
        // @ts-expect-error
        walletClient.ecdsaProvider = ecdsaProvider;

        return walletClient as WalletClient;
    }
}
