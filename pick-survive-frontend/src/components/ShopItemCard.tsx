'use client';

interface ShopItem {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  pricePoints: number;
  imageUrl?: string;
  isActive: boolean;
}

interface ShopItemCardProps {
  item: ShopItem;
  userPoints: number;
  owned?: boolean;
  isSelected?: boolean;
  onPurchase?: (itemId: string) => void;
  onSelect?: (itemId: string) => void;
}

import { getLogoEmoji } from '@/utils/logoHelper';

export default function ShopItemCard({ item, userPoints, owned = false, isSelected = false, onPurchase, onSelect }: ShopItemCardProps) {
  const canAfford = userPoints >= item.pricePoints;

  return (
    <div className={`
      relative card border-2 transition-all duration-300 overflow-hidden
      ${isSelected ? 'border-blue-500 bg-blue-900/30 ring-4 ring-blue-500/50' : owned ? 'border-green-500/50 bg-green-900/20' : 'border-gray-600'}
      ${!canAfford && !owned ? 'opacity-60' : 'hover:shadow-xl hover:scale-105'}
    `}>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
          ⭐ Seleccionado
        </div>
      )}
      {owned && !isSelected && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
          ✓ Comprado
        </div>
      )}

      <div className="p-6">
        {/* Imagen/Preview */}
        <div className={`w-full h-32 bg-gradient-to-br ${isSelected ? 'from-blue-900/50 to-blue-800/50' : 'from-blue-900/30 to-purple-900/30'} rounded-lg mb-4 flex items-center justify-center border border-gray-700`}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-6xl">{getLogoEmoji(item.code)}</span>
          )}
        </div>

        {/* Información */}
        <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
        <p className="text-sm text-gray-300 mb-4">{item.description}</p>

        {/* Precio */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">Precio:</span>
          <div className="flex items-center space-x-1">
            <span className="text-yellow-400">🪙</span>
            <span className="font-bold text-white">{item.pricePoints}</span>
            <span className="text-xs text-gray-400">mon</span>
          </div>
        </div>

        {/* Botones */}
        <div className="space-y-2">
          {owned ? (
            <button
              onClick={() => onSelect?.(item.id)}
              disabled={isSelected}
              className={`
                w-full font-semibold py-2 px-4 rounded-lg transition-all duration-200
                ${isSelected 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'btn-success'
                }
              `}
            >
              {isSelected ? '✓ Ya seleccionado' : 'Seleccionar'}
            </button>
          ) : (
            <button
              onClick={() => onPurchase?.(item.id)}
              disabled={!canAfford}
              className={`
                w-full font-semibold py-2 px-4 rounded-lg transition-all duration-200
                ${canAfford
                  ? 'btn-primary'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {canAfford ? `Comprar por ${item.pricePoints} mon` : `Necesitas ${item.pricePoints - userPoints} mon más`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

