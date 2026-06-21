
'use client';

// This context is currently empty as all campaign functionality has been simplified.
// It is kept in place for potential future state management needs related to campaigns.

import React, { createContext, useContext, ReactNode } from 'react';

interface CampaignContextType {
  // Currently no state to manage here.
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider = ({ children }: { children: ReactNode }) => {
  const value = {}; // No-op for now

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};
