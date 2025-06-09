import AppSidebar from "./_components/sidebar/sidebar";
import { CurrentChatProvider } from "@repo/web/app/(private)/_providers/current-chat-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <CurrentChatProvider>
        <main className="w-full">{children}</main>
      </CurrentChatProvider>
    </div>
  );
}
