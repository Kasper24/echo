"use client";

import * as React from "react";

interface CurrentChatContextType {
  chatId: number | null;
  setChatId: (chatId: number | null) => void;
}

const CurrentChatContext = React.createContext<CurrentChatContextType | undefined>(undefined);

const CurrentChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [chatId, setChatId] = React.useState<number | null>(null);

  return (
    <CurrentChatContext.Provider value={{ chatId, setChatId }}>
      {children}
    </CurrentChatContext.Provider>
  );
};

const useCurrentChat = () => {
  const context = React.useContext(CurrentChatContext);
  if (!context) throw new Error("useCurrentChat must be used within an CurrentChatProvider");
  return context;
};

export { CurrentChatProvider, useCurrentChat };
