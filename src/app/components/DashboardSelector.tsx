import { useState } from 'react';
import { DashboardStyle1 } from './DashboardStyle1';
import { DashboardStyle2 } from './DashboardStyle2';
import { DashboardStyle3 } from './DashboardStyle3';
import { LayoutGrid, BarChart3, Zap } from 'lucide-react';

export type DashboardStyle = 'style1' | 'style2' | 'style3';

export function DashboardSelector() {
  const [selectedStyle, setSelectedStyle] = useState<DashboardStyle>('style1');

  const styles = [
    {
      id: 'style1' as DashboardStyle,
      name: 'Moderne & Cartes',
      description: 'Design moderne avec cartes colorées et statistiques',
      icon: LayoutGrid,
      preview: '🎨',
    },
    {
      id: 'style2' as DashboardStyle,
      name: 'Analytique',
      description: 'Dashboard avec graphiques et métriques détaillées',
      icon: BarChart3,
      preview: '📊',
    },
    {
      id: 'style3' as DashboardStyle,
      name: 'Compact & Coloré',
      description: 'Interface compacte avec boutons d\'action rapides',
      icon: Zap,
      preview: '⚡',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sélecteur de style */}
      <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
        <h3 className="text-xl font-bold text-purple-900 mb-4">
          Choisissez votre style de tableau de bord
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {styles.map((style) => {
            const Icon = style.icon;
            const isSelected = selectedStyle === style.id;

            return (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-blue-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-xl ${isSelected ? 'bg-purple-600' : 'bg-purple-100'}`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                  </div>
                  <span className="text-3xl">{style.preview}</span>
                </div>

                <h4 className={`font-bold mb-2 ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                  {style.name}
                </h4>
                <p className={`text-sm ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aperçu du dashboard sélectionné */}
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-purple-900">
            Aperçu : {styles.find(s => s.id === selectedStyle)?.name}
          </h3>
          <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-medium">
            Prévisualisation
          </span>
        </div>

        {selectedStyle === 'style1' && <DashboardStyle1 />}
        {selectedStyle === 'style2' && <DashboardStyle2 />}
        {selectedStyle === 'style3' && <DashboardStyle3 />}
      </div>
    </div>
  );
}
