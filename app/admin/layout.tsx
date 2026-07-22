import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administración",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
