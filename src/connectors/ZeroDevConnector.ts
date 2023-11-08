import { Connector } from "wagmi";
import { getConfig } from '@wagmi/core';
import { ECDSAProvider, PaymasterAndBundlerProviders, SupportedGasToken } from '@zerodev/sdk'
import type { Chain } from 'wagmi/chains';
import { normalizeChainId } from "../utilities/normalizeChainId.js";
import { ProjectConfiguration } from "../types/index.js";
import { getProjectsConfiguration } from "../utilities/getProjectsConfiguration.js";
import { createWalletClient, custom } from "viem";
import { SmartAccountSigner } from "@alchemy/aa-core";

export type AccountParams = {
    projectId: string
    owner: SmartAccountSigner
    index?: bigint

    shimDisconnect?: boolean
    disconnect?: () => Promise<any>,
    projectIds?: string[]
    rpcUrl?: string,
    gasToken?: SupportedGasToken,
    paymasterProvider?: PaymasterAndBundlerProviders,
    bundlerProvider?: PaymasterAndBundlerProviders,
    onlySendSponsoredTransaction?: boolean
}

export class ZeroDevConnector<Options = AccountParams> extends Connector<ECDSAProvider, Options> {
    provider: ECDSAProvider | null = null
    walletClient: any | null = null
    id = 'zeroDev'
    name = 'Zero Dev'
    ready: boolean = true
    projectsConfiguration?: Promise<ProjectConfiguration>
    projects?: Array<{id: string, chainId: number}>
    chainIdProjectIdMap: {[key: number]: string} = {}
    projectIdChainIdMap: {[key: string]: number} = {}
    protected shimDisconnectKey = `${this.id}.shimDisconnect`
    

    constructor({chains = [], options}: {chains?: Chain[]; options: Partial<AccountParams>}) {
        if (!options?.projectId && !options?.projectIds) throw Error('Please provide a projectId or projectIds')
        if (!options.projectId && options.projectIds) options.projectId = options.projectIds[0]
        if (options.projectId && !options.projectIds) options.projectIds = [options.projectId]
        super({chains, options: options as Options})
        this.getProjectsConfiguration()
    }

    async getProjectsConfiguration() {
        const options = await this.getOptions()
        if (options.projectIds) {
            if (!this.projectsConfiguration) this.projectsConfiguration = getProjectsConfiguration(options.projectIds)
        }
        if (!this.projects) {
            this.projects = (await this.projectsConfiguration)?.projects
        }
        return this.projects
    }

    async getProjectIdFromChainId(chainId: number) {
        if (!this.chainIdProjectIdMap[chainId]) {
            const projectId = (await this.getProjectsConfiguration())?.find(project => project.chainId === chainId)?.id
            if (projectId) {
                this.chainIdProjectIdMap[chainId] = projectId
            }
        }
        return this.chainIdProjectIdMap[chainId]
    }

    async getChainIdFromProjectId(projectId: string) {
        if (!this.projectIdChainIdMap[projectId]) {
            const chainId = (await this.getProjectsConfiguration())?.find(project => project.id === projectId)?.chainId
            if (chainId) {
                this.projectIdChainIdMap[projectId] = chainId
            }
        }
        return this.projectIdChainIdMap[projectId]
    }

    //@ts-expect-error
    async connect({ chainId }) {
        this.emit('message', { type: 'connecting' })
        const provider = await this.getProvider()
        const account = await this.getAccount()
        const id = await this.getChainId()
        if ((await this.getOptions()).shimDisconnect) getConfig().storage?.setItem(this.shimDisconnectKey, true)

        return {
            account,
            chain: { id, unsupported: this.isChainUnsupported(id) },
            provider
        }
    }

    async getOptions(): Promise<AccountParams> {
        return this.options as AccountParams
    }

    async getProvider() {
        if (this.provider === null) {
            const options = await this.getOptions()
            this.provider = await ECDSAProvider.init({
                bundlerProvider: options.bundlerProvider,
                projectId: options.projectId,
                owner: options.owner,
                opts: {
                    providerConfig: {
                        rpcUrl: options.rpcUrl
                    },
                    accountConfig: {
                        index: options.index
                    },
                    paymasterConfig: {
                        paymasterProvider: options.paymasterProvider,
                        onlySendSponsoredTransaction: options.onlySendSponsoredTransaction,
                        policy: options.gasToken ? 'TOKEN_PAYMASTER' :  "VERIFYING_PAYMASTER",
                        gasToken: options.gasToken
                    },
                }
            });
            //@ts-expect-error
            this.provider.on = () => {}
            //@ts-expect-error
            this.provider.removeListener = () => {}

        }
        return this.provider
    }

    async isAuthorized() {
        try {
            if (
                !(await this.getOptions()).shimDisconnect ||
                // If shim does not exist in storage, wallet is disconnected
                !getConfig().storage?.getItem(this.shimDisconnectKey)
            )
                return false
            const account = await this.getAccount()
            return !!account
        } catch {
            return false
        }
    }

    async getChainId() {
        //@ts-ignore
        const chainId = await this.getChainIdFromProjectId(this.options.projectId)
        if (!chainId) return this.chains[0].id
        return chainId
    }

    async getChain() {
        const chainId = await this.getChainId()
        const chain = this.chains.find(chain => chain.id === chainId)
        if (!chain) throw new Error(`Please add ${chainId} to chains`)
        return chain
    }

    async getWalletClient({ chainId }: { chainId?: number } = {}) {
        if (!this.walletClient) {
            const provider = await this.getProvider()
            if (!provider) throw new Error('provider is required')
            this.walletClient = createWalletClient({
                account: await this.getAccount(),
                chain: await this.getChain(),
                transport: custom(provider)
            })
            this.walletClient.sendUserOperation = provider.sendUserOperation.bind(provider)
            this.walletClient.waitForUserOperationTransaction = provider.waitForUserOperationTransaction.bind(provider)
            this.walletClient.ecdsaProvider = provider;
        }
        return this.walletClient
    }
    async getAccount() {
        const provider = await this.getProvider()
        if (!provider) throw new Error('provider is required')
        return await provider.getAddress()
    }

    protected isChainUnsupported(chainId: number) {
        return !this.getProjectIdFromChainId(chainId)
    }

    async disconnect(){
        const options = await this.getOptions()
        this.provider = null
        if (options.disconnect) {
            await options.disconnect()
        }
        if ((await this.getOptions()).shimDisconnect) getConfig().storage?.removeItem(this.shimDisconnectKey)
    }

    async switchChain(chainId: number) {
        try {
            const options = await this.getOptions()
            const projectId = await this.getProjectIdFromChainId(chainId)
            if (!projectId) throw Error (`Not Project provided associated with chain: ${chainId}`);
            options.projectId = projectId
            const chain = await this.getChain();
            this.provider = null
            this.walletClient = null
            await this.getProvider()
            await this.getWalletClient()
            this.emit("change", { chain: { id: chainId, unsupported: false } });
            return chain
        } catch (error) {
            throw error;
        }
    }

    protected onChainChanged(chainId: string | number): void {
        const id = normalizeChainId(chainId);
        const unsupported = this.isChainUnsupported(id);
        this.emit("change", { chain: { id, unsupported } });
    }

    protected onAccountsChanged(accounts: string[]): void {
        if (accounts.length === 0) this.emit("disconnect");
        else this.emit("change", { account: accounts[0] as `0x${string}` });
    }

    protected onDisconnect() {
        this.emit('disconnect')
        this.getOptions().then((options => {
            if (options.disconnect) {
                options.disconnect()
                if (options.shimDisconnect) getConfig().storage?.removeItem(this.shimDisconnectKey)
                this.provider = null
            }
        }))
    }

}