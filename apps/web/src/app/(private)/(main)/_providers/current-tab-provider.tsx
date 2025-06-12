"use client";

import * as React from "react";

interface CurrentTabContextType {
  currentTab: string;
  setCurrentTab: (currentTab: string) => void;
}

const CurrentTabContext = React.createContext<
  CurrentTabContextType | undefined
>(undefined);

const CurrentTabProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTab, setCurrentTab] = React.useState<string>("chats");

  return (
    <CurrentTabContext.Provider value={{ currentTab, setCurrentTab }}>
      {children}
    </CurrentTabContext.Provider>
  );
};

const useCurrentTab = () => {
  const context = React.useContext(CurrentTabContext);
  if (!context)
    throw new Error("useCurrentTab must be used within an CurrentTabProvider");
  return context;
};

export { CurrentTabProvider, useCurrentTab };
