import { createContext, useContext } from 'react';

export interface NavigationContextType {
  navigateToClub: (clubId: string) => void;
  navigateBack: () => void;
}

export const NavigationContext = createContext<NavigationContextType>({
  navigateToClub: () => {},
  navigateBack: () => {},
});

export function useNavigation(): NavigationContextType {
  return useContext(NavigationContext);
}
