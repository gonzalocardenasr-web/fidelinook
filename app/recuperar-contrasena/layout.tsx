import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar Contraseña",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
