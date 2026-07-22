import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Punto de Venta",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
