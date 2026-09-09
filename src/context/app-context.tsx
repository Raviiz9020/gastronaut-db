'use client';

import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  isOrderPlacedDialogOpen: boolean;
  showOrderPlacedDialog: () => void;
  closeOrderPlacedDialog: () => void;
  setIsOrderPlacedDialogOpen: (isOpen: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOrderPlacedDialogOpen, setIsOrderPlacedDialogOpen] = useState(false);

  const showOrderPlacedDialog = () => setIsOrderPlacedDialogOpen(true);
  const closeOrderPlacedDialog = () => setIsOrderPlacedDialogOpen(false);

  return (
    <AppContext.Provider
      value={{
        isOrderPlacedDialogOpen,
        showOrderPlacedDialog,
        closeOrderPlacedDialog,
        setIsOrderPlacedDialogOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
