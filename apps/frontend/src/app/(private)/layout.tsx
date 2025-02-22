import "@repo/frontend/styles/global.css";
import "@repo/ui/global.css";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@repo/ui/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@repo/ui/components/sidebar";
import AppSidebar from "@repo/frontend/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Echo",
  description: "Realtime chat app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          "font-sans antialiased bg-background text-foreground border-border",
          inter.className
        )}
      >
        <SidebarProvider>
          <AppSidebar />
          <main>
            <SidebarTrigger />
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
