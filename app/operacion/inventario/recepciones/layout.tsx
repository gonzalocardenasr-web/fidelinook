import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recepciones de Inventario",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
