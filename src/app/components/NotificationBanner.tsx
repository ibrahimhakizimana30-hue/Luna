import { useEffect, useState } from 'react';
import { X, MessageCircle } from 'lucide-react';

interface Notification {
  id: string;
  contact: string;
  message: string;
  timestamp: Date;
}

interface NotificationBannerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onView: (contact: string) => void;
}

export function NotificationBanner({ notifications, onDismiss, onView }: NotificationBannerProps) {
  const [visible, setVisible] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    notifications.forEach((notif) => {
      if (!visible[notif.id]) {
        setVisible((prev) => ({ ...prev, [notif.id]: true }));

        // Auto-dismiss après 5 secondes
        setTimeout(() => {
          handleDismiss(notif.id);
        }, 5000);
      }
    });
  }, [notifications]);

  const handleDismiss = (id: string) => {
    setVisible((prev) => ({ ...prev, [id]: false }));
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  return (
    <div className="fixed top-4 right-4 z-40 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        visible[notification.id] && (
          <div
            key={notification.id}
            className={`bg-white border-l-4 border-purple-600 rounded-lg shadow-xl p-4 transition-all duration-300 ${
              visible[notification.id] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900">{notification.contact}</p>
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 truncate">{notification.message}</p>
                <button
                  onClick={() => {
                    onView(notification.contact);
                    handleDismiss(notification.id);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold mt-1"
                >
                  Voir le message
                </button>
              </div>
            </div>
          </div>
        )
      ))}
    </div>
  );
}
