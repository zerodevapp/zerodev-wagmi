import { Connector } from "wagmi";
import { getConfig } from '@wagmi/core';
import { KernelBaseValidator, ECDSAValidator, KernelSmartContractAccount, ValidatorMode, ZeroDevProvider } from '@zerodevapp/sdk'
import type { Chain } from 'wagmi/chains';
import * as chains from 'viem/chains'
import { ChainId } from "@zerodevapp/web3auth/dist/types";
import { normalizeChainId } from "../utilities/normalizeChainId";
import { ProjectConfiguration } from "../types";
import { getProjectsConfiguration } from "../utilities/getProjectsConfiguration";
import { Account, WalletClient, createWalletClient, custom, getAddress } from "viem";
import { SmartAccountSigner } from "@alchemy/aa-core";

export type AccountParams = {
    projectId: string
    owner: SmartAccountSigner
    validator?: (owner: SmartAccountSigner, chain: Chain) => KernelBaseValidator

    shimDisconnect?: boolean
    disconnect?: () => Promise<any>,
    projectIds?: string[]
    // index?: BigInt,
    // rpcProvider?: JsonRpcProvider | FallbackProvider
    // bundlerUrl?: string
    // gasToken?: SupportedGasToken,
    // useWebsocketProvider?: boolean,
    // transactionTimeout?: number
    // paymasterProvider?: PaymasterProvider
}

export class ZeroDevConnector<Options = AccountParams> extends Connector<ZeroDevProvider, Options> {
    provider: ZeroDevProvider | null = null
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

    async connect({ chainId }: { chainId: ChainId }) {
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
        const options = this.options as AccountParams
        if (!options.validator && options.owner) {
            options.validator = (owner, chain) =>  new ECDSAValidator(({
                validatorAddress: "0x180D6465F921C7E0DEA0040107D342c87455fFF5",
                mode: ValidatorMode.sudo,
                owner,
                chain,
                entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
            }))
        }
        return this.options as AccountParams
    }

    async getProvider() {
        if (this.provider === null) {
            const options = await this.getOptions()
            const chain = await this.getChain()
            const validator = options.validator!(options.owner, chain)
            this.provider = new ZeroDevProvider({
                chain,
                projectId: options.projectId,
                entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
            }).connect((rpcClient) => {
                console.log(rpcClient)
                return new KernelSmartContractAccount({
                owner: options.owner,
                index: BigInt(0),
                entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
                factoryAddress: '0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39',
                validator,
                defaultValidator: validator,
                rpcClient,
                chain
            })}).withZeroDevPaymasterAndData({policy: 'VERIFYING_PAYMASTER'})
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