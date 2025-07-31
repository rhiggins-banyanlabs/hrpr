// app/layout.tsx - Updated to include AdminAuthProvider
import type { Metadata } from "next";
import { Inter, Orbitron, Audiowide, Rajdhani } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/components/admin/security/AdminAuthContext";

const inter = Inter({ subsets: ["latin"] });

// Cool fonts for HRPR
const orbitron = Orbitron({ 
  subsets: ["latin"],
  variable: '--font-orbitron',
  display: 'swap',
});

const audiowide = Audiowide({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-audiowide',
  display: 'swap',
});

const rajdhani = Rajdhani({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Harper - AI Event Assistant",
  description: "Your intelligent conference companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${audiowide.variable} ${rajdhani.variable}`}>
      <body className={inter.className}>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  );
}