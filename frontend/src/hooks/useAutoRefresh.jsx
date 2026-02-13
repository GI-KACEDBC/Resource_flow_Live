// ## Auto-Refresh Hook
// ## Monitors localStorage for entity creation flags and triggers refresh callbacks
import { useEffect, useRef } from 'react';

/**
 * Hook to automatically refresh data when entities are created
 * @param {Function} refreshCallback - Function to call when refresh is triggered
 * @param {Array<string>} entityTypes - Array of entity types to monitor (e.g., ['request', 'donation', 'project'])
 * @param {Array} dependencies - Dependencies for the effect (e.g., [user?.id])
 */
export const useAutoRefresh = (refreshCallback, entityTypes = [], dependencies = []) => {
  const debounceTimerRef = useRef(null);
  const lastRefreshRef = useRef(0);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!refreshCallback || entityTypes.length === 0) return;

    // Debounced refresh function to prevent rapid-fire calls
    const debouncedRefresh = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const minInterval = 3000; // Minimum 3 seconds between refreshes

      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // If we're already refreshing or it's too soon, debounce it
      if (isRefreshingRef.current || timeSinceLastRefresh < minInterval) {
        debounceTimerRef.current = setTimeout(() => {
          if (!isRefreshingRef.current) {
            isRefreshingRef.current = true;
            lastRefreshRef.current = Date.now();
            refreshCallback().finally(() => {
              isRefreshingRef.current = false;
            });
          }
        }, minInterval - timeSinceLastRefresh);
        return;
      }

      // Refresh immediately if enough time has passed
      isRefreshingRef.current = true;
      lastRefreshRef.current = Date.now();
      refreshCallback().finally(() => {
        isRefreshingRef.current = false;
      });
    };

    // Check if any entity was just created
    const checkForNewEntities = () => {
      let shouldRefresh = false;
      
      entityTypes.forEach(entityType => {
        const flag = localStorage.getItem(`${entityType}_created`);
        if (flag) {
          shouldRefresh = true;
          localStorage.removeItem(`${entityType}_created`);
        }
      });

      if (shouldRefresh) {
        debouncedRefresh();
      }
    };

    // Check immediately and set up interval to check periodically (every 3 seconds instead of 1)
    checkForNewEntities();
    const interval = setInterval(checkForNewEntities, 3000);

    // Also listen for storage events (in case of multiple tabs)
    const handleStorageChange = (e) => {
      if (entityTypes.some(type => e.key === `${type}_created`)) {
        entityTypes.forEach(type => {
          if (e.key === `${type}_created`) {
            localStorage.removeItem(`${type}_created`);
          }
        });
        debouncedRefresh();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshCallback, ...dependencies]);
};
