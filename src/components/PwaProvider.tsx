"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PwaProvider({ children }: Props) {
  return (
    <SerwistProvider
      swUrl={"/serwist/sw.js"}
      disable={process.env.NODE_ENV !== "production"}
      cacheOnNavigation={false}
    >
      {children}
    </SerwistProvider>
  );
}
