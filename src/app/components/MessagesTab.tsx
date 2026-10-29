import { useState, useEffect } from 'react';
import { MessageCircle, Send, Clock, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  contact: string;
  text: string;
  timestamp: Date;
  sent: boolean;
  synced: boolean;
}

interface MessagesTabProps {
  selectedContact: string | null;
  setSelectedContact: (contact: string | null) => void;
  onNewMessage?: (message: Message) => void;
}

export function MessagesTab({ selectedContact, setSelectedContact, onNewMessage }: MessagesTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      contact: 'Marie Dubois',
      text: 'Salut ! Comment ça va ?',
      timestamp: new Date(2026, 4, 15, 10, 30),
      sent: false,
      synced: true,
    },
    {
      id: '2',
      contact: 'Marie Dubois',
      text: 'Ça va bien merci ! Et toi ?',
      timestamp: new Date(2026, 4, 15, 10, 32),
      sent: true,
      synced: true,
    },
    {
      id: '3',
      contact: 'Jean Martin',
      text: 'N\'oublie pas la réunion de demain',
      timestamp: new Date(2026, 4, 14, 16, 20),
      sent: false,
      synced: true,
    },
  ]);

  const [newMessage, setNewMessage] = useState('');

  // Simuler la réception de nouveaux messages toutes les 15 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      const contacts = ['Marie Dubois', 'Jean Martin', 'Sophie Laurent'];
      const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
      const randomMessages = [
        'Salut ! Tu es disponible ?',
        'On se voit ce soir ?',
        'Merci pour ton aide !',
        'As-tu reçu mon message ?',
        'À tout à l\'heure !',
      ];

      const newMessage: Message = {
        id: Date.now().toString(),
        contact: randomContact,
        text: randomMessages[Math.floor(Math.random() * randomMessages.length)],
        timestamp: new Date(),
        sent: false,
        synced: true,
      };

      setMessages(prev => [...prev, newMessage]);

      // Notifier le parent si le message n'est pas du contact actuellement sélectionné
      if (onNewMessage && randomContact !== selectedContact) {
        onNewMessage(newMessage);
      }
    }, 15000); // Toutes les 15 secondes

    return () => clearInterval(interval);
  }, [selectedContact, onNewMessage]);

  const contacts = Array.from(new Set(messages.map(m => m.contact)));
  const contactMessages = messages.filter(m => m.contact === selectedContact);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;

    const message: Message = {
      id: Date.now().toString(),
      contact: selectedContact,
      text: newMessage,
      timestamp: new Date(),
      sent: true,
      synced: navigator.onLine,
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  return (
    <div className="flex gap-4 h-[600px]">
      <div className="w-80 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">Contacts</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <button
              key={contact}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 text-left hover:bg-purple-50 transition-colors border-b border-purple-100 ${
                selectedContact === contact ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-l-purple-600' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {contact.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{contact}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {messages.filter(m => m.contact === contact).slice(-1)[0]?.text}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden">
        {selectedContact ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedContact.charAt(0)}
                </div>
                <h3 className="font-semibold">{selectedContact}</h3>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {contactMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      message.sent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p>{message.text}</p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <span className={`text-xs ${message.sent ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {message.sent && (
                        message.synced ? (
                          <CheckCheck className="w-3 h-3 text-blue-100" />
                        ) : (
                          <Clock className="w-3 h-3 text-blue-100" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrivez un message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {!navigator.onLine && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Les messages seront envoyés lors de la reconnexion
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4" />
              <p>Sélectionnez un contact pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
