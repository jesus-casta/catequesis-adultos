import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catequesis de adultos",
  description: "Fichas, grupos y documentación. Primera versión local para revisión.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
