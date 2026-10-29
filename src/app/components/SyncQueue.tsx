import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export function SyncQueue() {
  const [pendingItems, setPendingItems] = useState(3);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (pendingItems > 0) {
        handleSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingItems]);

  const handleSync = () => {
    if (!isOnline) return;

    setSyncing(true);
    setTimeout(() => {
      setPendingItems(0);
      setSyncing(false);
    }, 2000);
  };

  if (pendingItems === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <div>
            <p className="font-semibold text-orange-900">
              {pendingItems} élément{pendingItems > 1 ? 's' : ''} en attente de synchronisation
            </p>
            <p className="text-sm text-orange-700">
              {isOnline
                ? 'Connexion rétablie - Cliquez pour synchroniser'
                : 'En attente de connexion internet'}
            </p>
          </div>
        </div>
        {isOnline && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </button>
        )}
      </div>
    </div>
  );
}
