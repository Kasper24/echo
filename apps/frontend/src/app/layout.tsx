import "@repo/frontend/styles/globals.css";
import "@repo/ui/globals.css";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@repo/ui/lib/utils";
import { ThemeProvider } from "@repo/ui/providers/theme-provider";

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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div>{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
