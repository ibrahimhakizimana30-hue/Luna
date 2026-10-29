import { useState, useEffect } from 'react';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SyncQueue } from './components/SyncQueue';
import { TransactionsTab } from './components/TransactionsTab';
import { MessagesTab } from './components/MessagesTab';
import { CallsTab } from './components/CallsTab';
import { Tutorial } from './components/Tutorial';
import { NotificationBanner } from './components/NotificationBanner';
import { DashboardStyle3 } from './components/DashboardStyle3';
import { SavingsAccount } from './components/SavingsAccount';
import { KYCVerification } from './components/KYCVerification';
import { PinSetup } from './components/PinSetup';
import { BiometricSetup } from './components/BiometricSetup';
import { PinLogin } from './components/PinLogin';
import { SignupLogin } from './components/SignupLogin';
import { FreeTrialBanner } from './components/FreeTrialBanner';
import { TrialExpiredModal } from './components/TrialExpiredModal';
import { Wallet, MessageCircle, Video, Home, PiggyBank } from 'lucide-react';

type Tab = 'home' | 'transactions' | 'messages' | 'calls' | 'savings';

interface Notification {
  id: string;
  contact: string;
  message: string;
  timestamp: Date;
}

interface Message {
  id: string;
  contact: string;
  text: string;
  timestamp: Date;
  sent: boolean;
  synced: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showTutorial, setShowTutorial] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>('Marie Dubois');

  // États de sécurité
  const [isRegistered, setIsRegistered] = useState(false);
  const [isKYCVerified, setIsKYCVerified] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPin, setUserPin] = useState('');
  const [userContact, setUserContact] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);

  // Période d'essai
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [showTrialExpired, setShowTrialExpired] = useState(false);

  // Vérifier le statut de sécurité et période d'essai au chargement
  useEffect(() => {
    const registered = localStorage.getItem('luna_registered') === 'true';
    const contact = localStorage.getItem('luna_user_contact') || '';
    const kycVerified = localStorage.getItem('luna_kyc_verified') === 'true';
    const pinSet = localStorage.getItem('luna_pin_set') === 'true';
    const storedPin = localStorage.getItem('luna_user_pin') || '';
    const biometricEnabled = localStorage.getItem('luna_biometric_enabled') === 'true';
    const hasSeenTutorial = localStorage.getItem('luna_tutorial_seen');
    const trialStart = localStorage.getItem('luna_trial_start');

    setIsRegistered(registered);
    setUserContact(contact);
    setIsKYCVerified(kycVerified);
    setIsPinSet(pinSet);
    setUserPin(storedPin);
    setIsBiometricEnabled(biometricEnabled);

    // Calculer les jours restants de la période d'essai
    if (trialStart) {
      const startDate = new Date(trialStart);
      setTrialStartDate(startDate);
      const now = new Date();
      const diffTime = now.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, 7 - diffDays);
      setTrialDaysRemaining(remaining);

      // Si période d'essai expirée et pas de KYC
      if (remaining === 0 && !kycVerified) {
        setShowTrialExpired(true);
      }
    }

    // Déterminer quel écran afficher
    if (!registered) {
      setShowSignup(true);
    } else if (!pinSet) {
      setShowPinSetup(true);
    } else {
      setShowPinLogin(true);
    }

    if (!hasSeenTutorial && registered && pinSet) {
      setShowTutorial(true);
    }
  }, []);

  // Vérifier la période d'essai toutes les heures
  useEffect(() => {
    if (!isKYCVerified && trialStartDate) {
      const interval = setInterval(() => {
        const now = new Date();
        const diffTime = now.getTime() - trialStartDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const remaining = Math.max(0, 7 - diffDays);
        setTrialDaysRemaining(remaining);

        if (remaining === 0) {
          setShowTrialExpired(true);
        }
      }, 3600000); // Vérifier toutes les heures

      return () => clearInterval(interval);
    }
  }, [isKYCVerified, trialStartDate]);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('luna_tutorial_seen', 'true');
  };

  const handleSignupComplete = (method: 'phone' | 'email', value: string) => {
    setIsRegistered(true);
    setUserContact(value);
    setShowSignup(false);
    setShowPinSetup(true);

    // Démarrer la période d'essai
    const now = new Date();
    setTrialStartDate(now);
    setTrialDaysRemaining(7);

    localStorage.setItem('luna_registered', 'true');
    localStorage.setItem('luna_user_contact', value);
    localStorage.setItem('luna_trial_start', now.toISOString());
  };

  const handleStartKYC = () => {
    setShowTrialExpired(false);
    setShowKYC(true);
  };

  const handleKYCComplete = () => {
    setIsKYCVerified(true);
    setShowKYC(false);
    setIsAuthenticated(true);
    localStorage.setItem('luna_kyc_verified', 'true');
  };

  const handlePinSetupComplete = (pin: string) => {
    setUserPin(pin);
    setIsPinSet(true);
    setShowPinSetup(false);
    setShowBiometricSetup(true);
    localStorage.setItem('luna_pin_set', 'true');
    localStorage.setItem('luna_user_pin', pin);
  };

  const handleBiometricSetupComplete = () => {
    setIsBiometricEnabled(true);
    setShowBiometricSetup(false);
    setIsAuthenticated(true);
    localStorage.setItem('luna_biometric_enabled', 'true');
  };

  const handleBiometricSkip = () => {
    setShowBiometricSetup(false);
    setIsAuthenticated(true);
  };

  const handlePinLoginSuccess = () => {
    setShowPinLogin(false);
    setIsAuthenticated(true);
  };

  const handleNewMessage = (message: Message) => {
    const notification: Notification = {
      id: message.id,
      contact: message.contact,
      message: message.text,
      timestamp: message.timestamp,
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleViewMessage = (contact: string) => {
    setSelectedContact(contact);
    setActiveTab('messages');
  };

  // Afficher les écrans de sécurité si nécessaire
  if (showSignup) {
    return <SignupLogin onComplete={handleSignupComplete} />;
  }

  if (showKYC) {
    return <KYCVerification onComplete={handleKYCComplete} />;
  }

  if (showPinSetup) {
    return <PinSetup onComplete={handlePinSetupComplete} />;
  }

  if (showBiometricSetup) {
    return <BiometricSetup onComplete={handleBiometricSetupComplete} onSkip={handleBiometricSkip} />;
  }

  if (showPinLogin) {
    return <PinLogin correctPin={userPin} onSuccess={handlePinLoginSuccess} biometricEnabled={isBiometricEnabled} />;
  }

  // Afficher l'application seulement si authentifié
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="size-full bg-gradient-to-br from-violet-50 via-purple-50 to-blue-50 overflow-auto">
      {showTutorial && <Tutorial onClose={handleCloseTutorial} />}
      {showTrialExpired && <TrialExpiredModal onVerify={handleStartKYC} />}

      {/* Bannière période d'essai */}
      {!isKYCVerified && (
        <FreeTrialBanner
          daysRemaining={trialDaysRemaining}
          onUpgrade={handleStartKYC}
        />
      )}

      <NotificationBanner
        notifications={notifications}
        onDismiss={handleDismissNotification}
        onView={handleViewMessage}
      />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Luna 🌙</h1>
            <p className="text-purple-700">Échanges, messages et appels</p>
          </div>
          <OfflineIndicator />
        </div>

        <SyncQueue />

        <div className="bg-white rounded-xl shadow-lg border border-purple-200 overflow-hidden">
          <div className="flex border-b border-purple-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'home'
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-b-3 border-purple-600 shadow-sm'
                  : 'text-purple-600 hover:bg-purple-50/50'
              }`}
            >
              <Home className="w-5 h-5" />
              Accueil
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-b-3 border-purple-600 shadow-sm'
                  : 'text-purple-600 hover:bg-purple-50/50'
              }`}
            >
              <Wallet className="w-5 h-5" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('savings')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'savings'
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-b-3 border-purple-600 shadow-sm'
                  : 'text-purple-600 hover:bg-purple-50/50'
              }`}
            >
              <PiggyBank className="w-5 h-5" />
              Épargne
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'messages'
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-b-3 border-purple-600 shadow-sm'
                  : 'text-purple-600 hover:bg-purple-50/50'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'calls'
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-b-3 border-purple-600 shadow-sm'
                  : 'text-purple-600 hover:bg-purple-50/50'
              }`}
            >
              <Video className="w-5 h-5" />
              Appels
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'home' && <DashboardStyle3 />}
            {activeTab === 'transactions' && <TransactionsTab />}
            {activeTab === 'savings' && <SavingsAccount />}
            {activeTab === 'messages' && (
              <MessagesTab
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                onNewMessage={handleNewMessage}
              />
            )}
            {activeTab === 'calls' && <CallsTab />}
          </div>
        </div>

        <div className="text-center text-sm text-purple-600 font-medium">
          <p>💡 Les actions effectuées hors ligne seront synchronisées automatiquement lors de la reconnexion</p>
        </div>
      </div>
    </div>
  );
}
