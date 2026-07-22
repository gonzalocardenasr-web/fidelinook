import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Cuenta",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
