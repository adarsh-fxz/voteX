"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { type ReactNode, useMemo } from "react";
import { RPC_ENDPOINT } from "@/lib/constants";
import { solanaConnectionConfig } from "@/lib/solana-connection-config";

import "@solana/wallet-adapter-react-ui/styles.css";

type Props = {
  children: ReactNode;
};

export function WalletContextProvider({ children }: Props) {
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT} config={solanaConnectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
