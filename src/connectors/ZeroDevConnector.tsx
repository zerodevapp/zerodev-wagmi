import { Connector } from "wagmi";
import { Signer, getClient, normalizeChainId } from '@wagmi/core';
import { ZeroDevProvider, ZeroDevSigner, getProjectsConfiguration, getZeroDevProvider } from '@zerodevapp/sdk'
import { Hooks } from '@zerodevapp/sdk/dist/src/ClientConfig'
import type { Chain } from 'wagmi/chains';
import { AccountImplementation } from "@zerodevapp/sdk/dist/src/accounts";
import { BaseAccountAPI, BaseApiParams } from "@zerodevapp/sdk/dist/src/BaseAccountAPI";
import { ProjectConfiguration, SupportedGasToken, PaymasterProvider, BundlerProvider } from "@zerodevapp/sdk/dist/src/types";
import { ChainId } from "@zerodevapp/web3auth/dist/types";
import { JsonRpcProvider, FallbackProvider } from '@ethersproject/providers'

export type AccountParams = {
    shimDisconnect?: boolean
    projectId: string
    projectIds?: string[]
    owner: Signer
    rpcProvider?: JsonRpcProvider | FallbackProvider
    bundlerUrl?: string
    implementation?: AccountImplementation<BaseAccountAPI, BaseApiParams>
    hooks?: Hooks
    disconnect?: () => Promise<any>,
    gasToken?: SupportedGasToken,
    useWebsocketProvider?: boolean,
    transactionTimeout?: number
    paymasterProvider?: PaymasterProvider
    bundlerProvider?: BundlerProvider
}

export class ZeroDevConnector<Options = AccountParams> extends Connector<ZeroDevProvider, Options, ZeroDevSigner> {
    provider: ZeroDevProvider | null = null
    id = 'zeroDev'
    name = 'Zero Dev'
    ready: boolean = true
    projectsConfiguration?: Promise<ProjectConfiguration>
    projects?: Array<{id: string, chainId: number}>
    originalProvider?: ZeroDevProvider
    chainIdProjectIdMap: {[key: number]: string}
    projectIdChainIdMap: {[key: string]: number}
    protected shimDisconnectKey = `${this.id}.shimDisconnect`
    

    constructor({chains = [], options}: {chains?: Chain[]; options: Partial<AccountParams>}) {
        if (!options?.projectId && !options?.projectIds) throw Error('Please provide a projectId or projectIds')
        if (!options.projectId && options.projectIds) options.projectId = options.projectIds[0]
        if (options.projectId && !options.projectIds) options.projectIds = [options.projectId]
        super({chains, options: options as Options})
        this.getProjectsConfiguration()
        this.chainIdProjectIdMap = {}
        this.projectIdChainIdMap = {}
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

    async connect({ chainId }: { chainId: ChainId }) {
        this.emit('message', { type: 'connecting' })
        const provider = await this.getProvider()
        const account = await this.getAccount()
        const id = await this.getChainId()
        if ((await this.getOptions()).shimDisconnect) getClient().storage?.setItem(this.shimDisconnectKey, true)

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
            this.provider = await getZeroDevProvider(await this.getOptions())
            if (!this.originalProvider) this.originalProvider = this.provider
        }
        return this.provider
    }

    async isAuthorized() {
        try {
            if (
                !(await this.getOptions()).shimDisconnect ||
                // If shim does not exist in storage, wallet is disconnected
                !getClient().storage?.getItem(this.shimDisconnectKey)
            )
                return false
            const account = await this.getAccount()
            return !!account
        } catch {
            return false
        }
    }

    async getChainId() {
        if (this.provider === null) {
            const options = await this.getOptions()
            const chainId = await this.getChainIdFromProjectId(options.projectId)
            if (!chainId) return this.chains[0].id
            return chainId
        }
        return (await this.getProvider()).chainId
    }

    async getSigner() {
        return (await this.getProvider())?.getSigner()
    }
    async getAccount() {
        return (await (await this.getSigner())?.getAddress()) as '0x{string}';
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
        if ((await this.getOptions()).shimDisconnect) getClient().storage?.removeItem(this.shimDisconnectKey)
    }

    async switchChain(chainId: number) {
        try {
            const chain = this.chains.find((x) => x.id === chainId);
            if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
            const options = await this.getOptions()
            const projectId = await this.getProjectIdFromChainId(chainId)
            if (!projectId) throw Error (`Not Project provided associated with chain: ${chainId}`);
            this.provider = null
            options.projectId = projectId
            await this.getProvider()
            this.emit("change", { chain: { id: chainId, unsupported: false } });
            this.originalProvider?.emit("chainChanged")
            return chain;
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
                if (options.shimDisconnect) getClient().storage?.removeItem(this.shimDisconnectKey)
                this.provider = null
            }
        }))
    }

}