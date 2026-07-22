import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
