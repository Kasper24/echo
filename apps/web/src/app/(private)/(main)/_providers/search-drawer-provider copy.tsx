"use client";

import React, { createContext, useContext, useState } from "react";

interface SearchDrawerContextType {
  searchOpen: boolean;
  setSearchOpen: (query: boolean) => void;
}

const SearchDrawerContext = createContext<
  SearchDrawerContextType | undefined
>(undefined);

export const SearchDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <SearchDrawerContext.Provider value={{ searchOpen, setSearchOpen }}>
      {children}
    </SearchDrawerContext.Provider>
  );
};

export const useSearchDrawer = () => {
  const context = useContext(SearchDrawerContext);
  if (context === undefined) {
    throw new Error(
      "useSearchDrawer must be used within a SearchDrawerProvider"
    );
  }
  return context;
};
