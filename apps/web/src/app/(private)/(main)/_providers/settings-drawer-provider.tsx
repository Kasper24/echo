"use client";

import React, { createContext, useContext, useState } from "react";

interface SettingsDrawerContextType {
  settingsOpen: boolean;
  setSettingsOpen: (query: boolean) => void;
}

const SettingsDrawerContext = createContext<
  SettingsDrawerContextType | undefined
>(undefined);

export const SettingsDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SettingsDrawerContext.Provider value={{ settingsOpen, setSettingsOpen }}>
      {children}
    </SettingsDrawerContext.Provider>
  );
};

export const useSettingsDrawer = () => {
  const context = useContext(SettingsDrawerContext);
  if (context === undefined) {
    throw new Error(
      "useSettingsDrawer must be used within a SettingsDrawerProvider"
    );
  }
  return context;
};
