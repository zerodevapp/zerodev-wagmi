import {
  Address,
  WalletClient,
} from 'wagmi';
import {
  createWalletClient,
  custom,
} from 'viem';
import { PrivyConnector } from '@privy-io/wagmi-connector'
import { ECDSAProvider, getRPCProviderOwner } from '@zerodev/sdk';
import { normalizeChainId } from '../../utilities/normalizeChainId';


export class ZeroDevPrivyConnector extends PrivyConnector<{projectId: string}> {
  ready = false;
  id = 'zerodev-privy';
  name = 'ZeroDev Privy';

  #ecsdaProvider?: ECDSAProvider

  async getAccount(): Promise<Address> {
    if (!this.#ecsdaProvider) throw new Error('ECSDAProvider not initiated.')
    return await this.#ecsdaProvider.getAddress()
  }

  async getChainId() {
    const provider = await this.getProvider();
    const chainId = (await provider.request({
      method: 'eth_chainId',
    })) as number;

    return normalizeChainId(chainId);
  }

  async #getECSDAProvider(): Promise<ECDSAProvider> {
    if (!this.#ecsdaProvider) {
      if (!this.options) throw new Error('Requires options')
      const provider = await this.getProvider()
      this.#ecsdaProvider = await ECDSAProvider.init({
        ...this.options,
        owner: getRPCProviderOwner(provider)
      })
    }
    return this.#ecsdaProvider
  }

  async getWalletClient({chainId}: {chainId?: number} = {}): Promise<WalletClient> {
    const chain = this.chains.find((x) => x.id === chainId);

    const ecsdaProvider = await this.#getECSDAProvider()

    return createWalletClient({
      account: await ecsdaProvider.getAddress(),
      chain,
      transport: custom(ecsdaProvider),
    });
  }
}
