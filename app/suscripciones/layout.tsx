import type { Metadata } from "next";

import PlatformShell from "@/components/platform/PlatformShell";

export const metadata: Metadata = {
  title: "Suscripciones",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PlatformShell>{children}</PlatformShell>;
}
