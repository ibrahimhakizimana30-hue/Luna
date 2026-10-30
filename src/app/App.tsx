import { useState, useEffect } from 'react';
import { ThemePicker } from './components/ThemePicker';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SyncQueue } from './components/SyncQueue';
import { TransactionsTab } from './components/TransactionsTab';
import { MessagesTab } from './components/MessagesTab';
import { LunaMessages } from './components/LunaMessages';
import { AdminKyc } from './components/AdminKyc';
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
import { Wallet, MessageCircle, Video, Home, PiggyBank, LogOut, AlertCircle, ShieldCheck } from 'lucide-react';
import { hasPin, migrateLegacyPin, savePin } from './security/pin';
import { getBiometricCredentialId } from './security/biometric';
import {
  type Profile,
  getProfile,
  hasRemotePin,
  hasSession,
  isAdmin,
  isBackendEnabled,
  setRemotePin,
  signOut,
} from './backend';

// Demande de nouveau PIN après « Code PIN oublié ? » (mode serveur)
const PIN_RESET_KEY = 'luna_pin_reset';
const TRIAL_DAYS = 7;

function trialDaysLeft(start: Date): number {
  const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - diffDays);
}

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
  const [userContact, setUserContact] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [kycStatus, setKycStatus] = useState<Profile['kyc_status']>('none');
  const [loadError, setLoadError] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Période d'essai
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [showTrialExpired, setShowTrialExpired] = useState(false);

  const applyTrial = (start: Date, kycApproved: boolean) => {
    const remaining = trialDaysLeft(start);
    setTrialStartDate(start);
    setTrialDaysRemaining(remaining);
    if (remaining === 0 && !kycApproved) {
      setShowTrialExpired(true);
    }
  };

  // Mode serveur : session, profil, PIN et KYC viennent du serveur Luna
  const loadBackendState = async () => {
    setLoadError('');
    try {
      if (!(await hasSession())) {
        setShowSignup(true);
        return;
      }
      const [profile, pinSet] = await Promise.all([getProfile(), hasRemotePin()]);
      const approved = profile.kyc_status === 'approved';

      setIsRegistered(true);
      setUserContact(profile.contact);
      void isAdmin().then(setIsAdminUser);
      setKycStatus(profile.kyc_status);
      setIsKYCVerified(approved);
      setIsPinSet(pinSet);
      setIsBiometricEnabled(!!getBiometricCredentialId());
      applyTrial(new Date(profile.trial_started_at), approved);

      setShowSignup(false);
      if (!pinSet || sessionStorage.getItem(PIN_RESET_KEY) === 'true') {
        setShowPinSetup(true);
      } else {
        setShowPinLogin(true);
      }
      if (pinSet && !localStorage.getItem('luna_tutorial_seen')) {
        setShowTutorial(true);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Connexion au serveur impossible');
    }
  };

  // Vérifier le statut de sécurité et période d'essai au chargement
  useEffect(() => {
    const init = async () => {
      if (isBackendEnabled) {
        await loadBackendState();
        return;
      }

      // Convertit un ancien PIN stocké en clair avant toute lecture
      await migrateLegacyPin();

      const registered = localStorage.getItem('luna_registered') === 'true';
      const contact = localStorage.getItem('luna_user_contact') || '';
      const kycVerified = localStorage.getItem('luna_kyc_verified') === 'true';
      const pinSet = hasPin();
      const biometricEnabled = !!getBiometricCredentialId();
      const hasSeenTutorial = localStorage.getItem('luna_tutorial_seen');
      const trialStart = localStorage.getItem('luna_trial_start');

      setIsRegistered(registered);
      setUserContact(contact);
      setIsKYCVerified(kycVerified);
      setIsPinSet(pinSet);
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
    };

    init();
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
    if (isBackendEnabled) {
      // Compte nouveau ou existant : le serveur indique où reprendre
      loadBackendState();
      return;
    }

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
    if (isBackendEnabled) {
      // Les documents sont envoyés : un administrateur doit maintenant valider
      setKycStatus('pending');
      setShowKYC(false);
      setIsAuthenticated(true);
      return;
    }

    setIsKYCVerified(true);
    setShowKYC(false);
    setIsAuthenticated(true);
    localStorage.setItem('luna_kyc_verified', 'true');
  };

  const handlePinSetupComplete = async (pin: string) => {
    if (isBackendEnabled) {
      try {
        await setRemotePin(pin);
        sessionStorage.removeItem(PIN_RESET_KEY);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Enregistrement du PIN impossible');
        sessionStorage.removeItem(PIN_RESET_KEY);
        await signOut();
        window.location.reload();
        return;
      }
    } else {
      // Seul un hachage du PIN est enregistré, jamais le PIN lui-même
      await savePin(pin);
    }
    setIsPinSet(true);
    setShowPinSetup(false);
    setShowBiometricSetup(true);
  };

  const handleBiometricSetupComplete = () => {
    setIsBiometricEnabled(true);
    setShowBiometricSetup(false);
    setIsAuthenticated(true);
  };

  const handleBiometricSkip = () => {
    setShowBiometricSetup(false);
    setIsAuthenticated(true);
  };

  const handlePinLoginSuccess = () => {
    setShowPinLogin(false);
    setIsAuthenticated(true);
  };

  // PIN oublié.
  // Mode serveur : on se reconnecte avec un code SMS/email, puis on choisit un nouveau PIN.
  // Mode démo : on efface les données Luna de l'appareil et on repart de l'inscription.
  const handleForgotPin = async () => {
    if (isBackendEnabled) {
      sessionStorage.setItem(PIN_RESET_KEY, 'true');
      await signOut();
      window.location.reload();
      return;
    }
    Object.keys(localStorage)
      .filter((key) => key.startsWith('luna_'))
      .forEach((key) => localStorage.removeItem(key));
    window.location.reload();
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

  const handleLogout = async () => {
    if (!confirm('Se déconnecter de Luna sur cet appareil ?')) return;
    await signOut();
    window.location.reload();
  };

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion au serveur impossible</h2>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <button
            onClick={loadBackendState}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

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
    return <BiometricSetup userLabel={userContact} onComplete={handleBiometricSetupComplete} onSkip={handleBiometricSkip} />;
  }

  if (showPinLogin) {
    return <PinLogin onSuccess={handlePinLoginSuccess} biometricEnabled={isBiometricEnabled} onForgotPin={handleForgotPin} />;
  }

  // Afficher l'application seulement si authentifié
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="size-full bg-gradient-to-br from-violet-50 via-purple-50 to-blue-50 overflow-auto">
      {/* Ruban aux couleurs du drapeau du Congo */}
      <div className="luna-ribbon" />
      {showAdmin && <AdminKyc onClose={() => setShowAdmin(false)} />}
      {showTutorial && <Tutorial onClose={handleCloseTutorial} />}
      {showTrialExpired && <TrialExpiredModal onVerify={handleStartKYC} kycPending={kycStatus === 'pending'} />}

      {/* Bannière période d'essai */}
      {!isKYCVerified && (
        <FreeTrialBanner
          daysRemaining={trialDaysRemaining}
          onUpgrade={handleStartKYC}
          kycPending={kycStatus === 'pending'}
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
            <div className="flex items-center gap-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Luna</h1>
              <ThemePicker />
            </div>
            <p className="text-purple-700">Échanges, messages et appels</p>
          </div>
          <div className="flex items-center gap-2">
            <OfflineIndicator />
            {isAdminUser && (
              <button
                onClick={() => setShowAdmin(true)}
                title="Vérifier les identités"
                aria-label="Vérifier les identités"
                className="p-2 rounded-full text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
            )}
            {isBackendEnabled && (
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                aria-label="Se déconnecter"
                className="p-2 rounded-full text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {!isBackendEnabled && <SyncQueue />}

        <div className="bg-white rounded-xl shadow-lg border border-purple-200 overflow-hidden">
          <div className="luna-ribbon" />
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
            {isBackendEnabled && ['calls', 'savings'].includes(activeTab) && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Cette fonction est encore en démonstration : les données affichées sont fictives.
              </div>
            )}
            {activeTab === 'home' && <DashboardStyle3 onNavigate={setActiveTab} />}
            {activeTab === 'transactions' && <TransactionsTab />}
            {activeTab === 'savings' && <SavingsAccount />}
            {activeTab === 'messages' && isBackendEnabled && <LunaMessages />}
            {activeTab === 'messages' && !isBackendEnabled && (
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
          {!isBackendEnabled && (
            <p>💡 Les actions effectuées hors ligne seront synchronisées automatiquement lors de la reconnexion</p>
          )}
          <p className="mt-2 space-x-3">
            <a href="/conditions.html" className="underline">Conditions d'utilisation</a>
            <a href="/confidentialite.html" className="underline">Confidentialité</a>
          </p>
        </div>
      </div>
    </div>
  );
}
