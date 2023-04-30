import { Signer } from 'ethers'
import { getNetwork } from 'wagmi/actions'
import { ChainMismatchError, ChainNotConfiguredError } from '@wagmi/core'

export function assertActiveChain({
  chainId,
  signer,
}: {
  chainId: number
  signer?: Signer
}) {
  // Check that active chain and target chain match
  const { chain: activeChain, chains } = getNetwork()
  const activeChainId = activeChain?.id
  if (activeChainId && chainId !== activeChainId) {
    throw new ChainMismatchError({
      activeChain:
        chains.find((x) => x.id === activeChainId)?.name ??
        `Chain ${activeChainId}`,
      targetChain:
        chains.find((x) => x.id === chainId)?.name ?? `Chain ${chainId}`,
    })
  }

  if (signer) {
    // Check that signer's chain and target chain match
    const signerChainId = (signer.provider as { network?: { chainId: number } })
      ?.network?.chainId
    if (signerChainId && chainId !== signerChainId) {
      throw new ChainNotConfiguredError({
        chainId,
        connectorId: 'unknown',
      })
    }
  }
}