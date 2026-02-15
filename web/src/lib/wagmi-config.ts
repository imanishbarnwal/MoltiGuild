import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { CHAIN_ID, MONAD_RPC, EXPLORER_URL, IS_MAINNET } from './constants';

export const monadChain = defineChain({
  id: CHAIN_ID,
  name: IS_MAINNET ? 'Monad' : 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_RPC] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: EXPLORER_URL },
  },
  testnet: !IS_MAINNET,
});

// Backwards compat alias
export const monadTestnet = monadChain;

export const wagmiConfig = getDefaultConfig({
  appName: 'MoltiGuild',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo',
  chains: [monadChain],
  ssr: true,
});
