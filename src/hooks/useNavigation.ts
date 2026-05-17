import { createContext, useContext } from 'react';

export interface NavigationContextType {
  navigateToClub: (clubId: string) => void;
  navigateToBinder: () => void;
  navigateBack: () => void;
}

export const NavigationContext = createContext<NavigationContextType>({
  navigateToClub: () => {},
  navigateToBinder: () => {},
  navigateBack: () => {},
});

export function useNavigation(): NavigationContextType {
  return useContext(NavigationContext);
}
