import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restablecer Contraseña",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
