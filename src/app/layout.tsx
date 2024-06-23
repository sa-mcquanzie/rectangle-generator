import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Make Room",
  description: "App for making a room",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
