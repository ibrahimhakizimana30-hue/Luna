import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
      isOnline ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Mode hors ligne</span>
        </>
      )}
    </div>
  );
}
