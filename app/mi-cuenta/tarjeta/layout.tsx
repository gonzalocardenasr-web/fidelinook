import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Tarjeta",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
