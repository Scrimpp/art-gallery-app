import type { Metadata } from "next";
import { ScrollControls } from "@/components/scroll-controls";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Garden",
  title: "Garden",
  description:
    "Garden is a dark, minimal art gallery for sharing visual stories, reserving future mints, and unlocking protected downloads through Supabase and X sign-in.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Garden",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ScrollControls />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
