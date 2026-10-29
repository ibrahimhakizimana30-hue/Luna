import { useState } from 'react';
import { Mail, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';

type AuthMethod = 'phone' | 'email';

export function SignupLogin({ onComplete }: { onComplete: (method: AuthMethod, value: string) => void }) {
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');

  const handleSendCode = () => {
    if (method === 'phone' && phoneNumber) {
      setStep('verify');
    } else if (method === 'email' && email) {
      setStep('verify');
    }
  };

  const handleVerify = () => {
    // Simuler la vérification du code
    if (verificationCode.length === 6) {
      const value = method === 'phone' ? phoneNumber : email;
      onComplete(method, value);
    }
  };

  const isValidPhone = phoneNumber.startsWith('+242') && phoneNumber.length >= 12;
  const isValidEmail = email.includes('@') && email.includes('.');

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
            <span className="text-5xl">🌙</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Bienvenue sur Luna</h1>
          <p className="text-sm opacity-90">
            Créez votre compte et profitez de 7 jours d'essai gratuit !
          </p>
        </div>

        <div className="p-8">
          {step === 'input' ? (
            <div className="space-y-6">
              {/* Sélection de méthode */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Choisissez votre méthode d'inscription
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMethod('phone')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      method === 'phone'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Phone className={`w-6 h-6 mx-auto mb-2 ${method === 'phone' ? 'text-purple-600' : 'text-gray-600'}`} />
                    <p className={`text-sm font-semibold ${method === 'phone' ? 'text-purple-900' : 'text-gray-900'}`}>
                      Téléphone
                    </p>
                  </button>

                  <button
                    onClick={() => setMethod('email')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      method === 'email'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Mail className={`w-6 h-6 mx-auto mb-2 ${method === 'email' ? 'text-purple-600' : 'text-gray-600'}`} />
                    <p className={`text-sm font-semibold ${method === 'email' ? 'text-purple-900' : 'text-gray-900'}`}>
                      Gmail
                    </p>
                  </button>
                </div>
              </div>

              {/* Formulaire */}
              <div>
                {method === 'phone' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      placeholder="+242 XXX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {phoneNumber && !isValidPhone && (
                      <p className="text-sm text-red-600 mt-1">
                        Format : +242 XXX XXX XXX
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Adresse Gmail
                    </label>
                    <input
                      type="email"
                      placeholder="votre.email@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {email && !isValidEmail && (
                      <p className="text-sm text-red-600 mt-1">
                        Veuillez entrer une adresse email valide
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Avantages période d'essai */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 mb-2">7 jours d'essai gratuit 🎉</p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>✓ Accès à toutes les fonctionnalités</li>
                      <li>✓ Transactions illimitées</li>
                      <li>✓ Messages et appels gratuits</li>
                      <li>✓ Compte d'épargne disponible</li>
                      <li>✓ Aucune carte bancaire requise</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendCode}
                disabled={method === 'phone' ? !isValidPhone : !isValidEmail}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continuer
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-xs text-center text-gray-500">
                En continuant, vous acceptez nos conditions d'utilisation
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Code de vérification
                </h3>
                <p className="text-gray-600 text-sm">
                  Entrez le code envoyé à {method === 'phone' ? phoneNumber : email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Code à 6 chiffres
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-bold tracking-widest"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vérifier
                </button>
              </div>

              <button className="w-full text-purple-600 font-semibold text-sm hover:underline">
                Renvoyer le code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
