import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprimir Pack",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
