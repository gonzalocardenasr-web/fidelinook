import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Perfil",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
