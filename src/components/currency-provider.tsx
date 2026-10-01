"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { setDefaultCurrencySymbol } from "@/lib/utils";

const CurrencyContext = createContext("Rs.");

export function CurrencyProvider({
  symbol,
  children,
}: {
  symbol: string;
  children: ReactNode;
}) {
  useEffect(() => {
    setDefaultCurrencySymbol(symbol);
  }, [symbol]);

  return <CurrencyContext.Provider value={symbol}>{children}</CurrencyContext.Provider>;
}

export function useCurrencySymbol() {
  return useContext(CurrencyContext);
}
