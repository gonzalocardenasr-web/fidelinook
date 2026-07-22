import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar Registro",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
