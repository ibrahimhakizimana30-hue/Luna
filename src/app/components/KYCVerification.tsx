import { useState } from 'react';
import { Upload, Camera, CheckCircle2, AlertCircle, User, CreditCard, FileText } from 'lucide-react';

type DocumentType = 'id-card' | 'niu-card' | 'driver-license' | 'passport';
type VerificationStep = 'documents' | 'selfie' | 'review' | 'completed';

interface UploadedDocument {
  type: DocumentType;
  recto?: File | null;
  verso?: File | null;
}

export function KYCVerification({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('documents');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('id-card');
  const [documents, setDocuments] = useState<UploadedDocument>({
    type: 'id-card',
    recto: null,
    verso: null,
  });
  const [selfie, setSelfie] = useState<File | null>(null);

  const documentTypes = [
    { id: 'id-card' as DocumentType, label: 'Pièce d\'identité', icon: User, needsVerso: true },
    { id: 'niu-card' as DocumentType, label: 'Carte NIU', icon: CreditCard, needsVerso: true },
    { id: 'driver-license' as DocumentType, label: 'Permis de conduire', icon: CreditCard, needsVerso: true },
    { id: 'passport' as DocumentType, label: 'Passeport', icon: FileText, needsVerso: false },
  ];

  const handleFileUpload = (side: 'recto' | 'verso', file: File | null) => {
    setDocuments({ ...documents, [side]: file });
  };

  const handleSelfieUpload = (file: File | null) => {
    setSelfie(file);
  };

  const canProceedToSelfie = () => {
    const selectedDoc = documentTypes.find(d => d.id === selectedDocType);
    if (selectedDoc?.needsVerso) {
      return documents.recto && documents.verso;
    }
    return documents.recto;
  };

  const handleSubmit = () => {
    // Simuler la vérification
    setTimeout(() => {
      setCurrentStep('completed');
      setTimeout(() => {
        onComplete();
      }, 2000);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold mb-2">Vérification KYC 🔐</h2>
          <p className="text-sm opacity-90">
            Vérifiez votre identité pour accéder à toutes les fonctionnalités de Luna
          </p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center gap-2 p-6 bg-purple-50">
          {['documents', 'selfie', 'review'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep === step
                    ? 'bg-purple-600 text-white'
                    : ['documents', 'selfie', 'review'].indexOf(currentStep) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {['documents', 'selfie', 'review'].indexOf(currentStep) > index ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 2 && (
                <div
                  className={`w-16 h-1 ${
                    ['documents', 'selfie', 'review'].indexOf(currentStep) > index
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div className="p-6">
          {currentStep === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Sélectionnez votre type de document
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {documentTypes.map((doc) => {
                    const Icon = doc.icon;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocType(doc.id);
                          setDocuments({ type: doc.id, recto: null, verso: null });
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedDocType === doc.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${selectedDocType === doc.id ? 'text-purple-600' : 'text-gray-600'}`} />
                        <p className={`font-semibold ${selectedDocType === doc.id ? 'text-purple-900' : 'text-gray-900'}`}>
                          {doc.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Téléchargez votre document
                </h3>
                <div className="space-y-4">
                  {/* Recto */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recto du document
                    </label>
                    <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center hover:border-purple-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('recto', e.target.files?.[0] || null)}
                        className="hidden"
                        id="recto-upload"
                      />
                      <label htmlFor="recto-upload" className="cursor-pointer">
                        {documents.recto ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                            <span className="font-semibold">{documents.recto.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-purple-600">
                            <Upload className="w-8 h-8" />
                            <span className="font-semibold">Cliquez pour télécharger</span>
                            <span className="text-xs text-gray-500">PNG, JPG jusqu'à 10MB</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Verso */}
                  {documentTypes.find(d => d.id === selectedDocType)?.needsVerso && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Verso du document
                      </label>
                      <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center hover:border-purple-500 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('verso', e.target.files?.[0] || null)}
                          className="hidden"
                          id="verso-upload"
                        />
                        <label htmlFor="verso-upload" className="cursor-pointer">
                          {documents.verso ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <CheckCircle2 className="w-6 h-6" />
                              <span className="font-semibold">{documents.verso.name}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-purple-600">
                              <Upload className="w-8 h-8" />
                              <span className="font-semibold">Cliquez pour télécharger</span>
                              <span className="text-xs text-gray-500">PNG, JPG jusqu'à 10MB</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setCurrentStep('selfie')}
                  disabled={!canProceedToSelfie()}
                  className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {currentStep === 'selfie' && (
            <div className="space-y-6">
              <div className="text-center">
                <Camera className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Vérification faciale
                </h3>
                <p className="text-gray-600">
                  Prenez une photo de votre visage pour confirmer votre identité
                </p>
              </div>

              <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleSelfieUpload(e.target.files?.[0] || null)}
                  className="hidden"
                  id="selfie-upload"
                />
                <label htmlFor="selfie-upload" className="cursor-pointer">
                  {selfie ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2 className="w-12 h-12 text-green-600" />
                      <span className="font-semibold text-green-600 text-lg">{selfie.name}</span>
                      <span className="text-sm text-gray-500">Selfie capturé avec succès</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Camera className="w-12 h-12 text-purple-600" />
                      <span className="font-semibold text-purple-600 text-lg">Prendre une photo</span>
                      <span className="text-sm text-gray-500">Assurez-vous d'être dans un endroit bien éclairé</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Conseils pour une bonne photo :</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Retirez lunettes et chapeau</li>
                      <li>Regardez directement la caméra</li>
                      <li>Fond neutre de préférence</li>
                      <li>Visage entièrement visible</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('documents')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={() => setCurrentStep('review')}
                  disabled={!selfie}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Vérification de vos documents
                </h3>
                <p className="text-gray-600">
                  Vérifiez que toutes les informations sont correctes avant de soumettre
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-purple-900">Type de document</span>
                    <span className="text-purple-700">
                      {documentTypes.find(d => d.id === selectedDocType)?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-900">Documents téléchargés</span>
                    <div className="flex gap-2">
                      {documents.recto && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                      {documents.verso && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">Vérification faciale</span>
                    {selfie && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-900">
                    <p className="font-semibold mb-1">Traitement de la vérification</p>
                    <p className="text-orange-800">
                      Votre demande sera examinée dans les 24-48 heures. Vous recevrez une notification une fois la vérification terminée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('selfie')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                >
                  Soumettre la vérification
                </button>
              </div>
            </div>
          )}

          {currentStep === 'completed' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Vérification soumise !
              </h3>
              <p className="text-gray-600 mb-6">
                Nous examinons vos documents. Vous serez notifié une fois la vérification terminée.
              </p>
              <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
