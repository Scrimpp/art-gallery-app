import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror Gallery",
  description:
    "A dark, minimal art gallery for sharing visual stories through Supabase and Twitter/X sign-in.",
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
