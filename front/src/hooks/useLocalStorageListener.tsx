import { useEffect } from 'react';

type StorageCallback = (newValue: unknown, oldValue: unknown, key: string) => void;

export function useLocalStorageListener(
  key: string,
  callback: StorageCallback
): void {
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        try {
          const newValue = event.newValue ? event.newValue : null;
          const oldValue = event.oldValue ? event.oldValue : null;
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error(`Error processing localStorage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, callback]);
}