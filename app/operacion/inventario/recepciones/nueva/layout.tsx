import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva Recepción",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
