import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Wallet, MessageCircle, Video, Wifi, WifiOff } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

const steps = [
  {
    title: 'Bienvenue sur Luna ! 🌙',
    description: 'Luna est votre application complète pour gérer vos transactions, messages et appels, même sans connexion internet.',
    icon: null,
  },
  {
    title: 'Transactions',
    description: 'Envoyez et recevez de l\'argent facilement. Créez une nouvelle transaction en cliquant sur le bouton "Nouvelle transaction". Vos transactions hors ligne seront synchronisées automatiquement.',
    icon: Wallet,
  },
  {
    title: 'Messages',
    description: 'Discutez avec vos contacts en temps réel. Sélectionnez un contact et envoyez des messages. Les messages non envoyés seront marqués avec une horloge ⏰ et envoyés dès que vous serez en ligne.',
    icon: MessageCircle,
  },
  {
    title: 'Appels',
    description: 'Passez des appels audio ou vidéo avec vos contacts. Note : les appels nécessitent une connexion internet active.',
    icon: Video,
  },
  {
    title: 'Mode hors ligne',
    description: 'Luna fonctionne même sans connexion ! Toutes vos actions (transactions, messages) seront sauvegardées et synchronisées automatiquement dès que vous serez reconnecté.',
    icon: WifiOff,
  },
  {
    title: 'Synchronisation',
    description: 'Lorsque vous vous reconnectez, une bannière apparaît pour synchroniser vos actions en attente. Cliquez simplement sur "Synchroniser" et le tour est joué ! ✨',
    icon: Wifi,
  },
];

export function Tutorial({ onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="my-auto bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center text-center pt-4">
            {Icon ? (
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-10 h-10" />
              </div>
            ) : (
              <div className="text-6xl mb-4">🌙</div>
            )}
            <h2 className="text-2xl font-bold">{step.title}</h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 text-center mb-6">{step.description}</p>

          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-blue-600'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Précédent
              </button>
            )}
            <button
              onClick={handleNext}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors ${
                currentStep === 0 ? 'flex-1' : 'flex-1'
              }`}
            >
              {currentStep === steps.length - 1 ? 'Commencer' : 'Suivant'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
