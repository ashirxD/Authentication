// src/context/AvailabilityContext.jsx
import { createContext, useContext } from 'react';

// Create Context for availability
const AvailabilityContext = createContext(null);

// Custom hook to use AvailabilityContext
export const useAvailability = () => {
  const context = useContext(AvailabilityContext);
  if (!context) {
    throw new Error('useAvailability must be used within an AvailabilityProvider');
  }
  return context;
};

// Export the Context for use in App.jsx
export default AvailabilityContext;