// app/layout.tsx - Updated to include AdminAuthProvider
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/components/admin/security/AdminAuthContext";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  );
}