'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';
import ShopItemCard from '@/components/ShopItemCard';
import PointBadge from '@/components/PointBadge';
import { useToast } from '@/hooks/useToast';

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

export default function ShopPage() {
  const { token, user, setUser } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [myItems, setMyItems] = useState<ShopItem[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadShopData();
    }
  }, [token]);

  const loadShopData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Cargar items disponibles
      const itemsRes = await fetch(API_ENDPOINTS.SHOP.ITEMS, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }

      // Cargar mis items
      const myItemsRes = await fetch(API_ENDPOINTS.SHOP.MY_ITEMS, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (myItemsRes.ok) {
        const myItemsData = await myItemsRes.json();
        setMyItems(myItemsData);
      }

      // Cargar mis monedas
      const coinsRes = await fetch(API_ENDPOINTS.COINS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (coinsRes.ok) {
        const coinsData = await coinsRes.json();
        setUserCoins(coinsData.totalCoins || 0);
      }

      // Cargar logo seleccionado
      const selectedLogoRes = await fetch(API_ENDPOINTS.SHOP.SELECTED_LOGO, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (selectedLogoRes.ok) {
        const selectedLogoData = await selectedLogoRes.json();
        setSelectedLogoId(selectedLogoData.selectedLogoId || null);
      }
    } catch (error) {
      toast.error('Error al cargar la tienda');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId: string) => {
    if (!token) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.SHOP.PURCHASE(itemId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        toast.success('¡Item comprado exitosamente!');
        loadShopData(); // Recargar datos
      } else {
        const error = await res.json();
        toast.error(error.message || 'Error al comprar el item');
      }
    } catch (error) {
      toast.error('Error al comprar el item');
    }
  };

  const handleSelectLogo = async (itemId: string) => {
    if (!token) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.SHOP.SELECT_LOGO(itemId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        toast.success('¡Logo seleccionado exitosamente!');
        setSelectedLogoId(itemId);
        
        // Recargar perfil del usuario para actualizar el logo en toda la app
        const profileRes = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const userData = await profileRes.json();
          setUser(userData);
        }
        
        loadShopData(); // Recargar datos para actualizar estado
      } else {
        const error = await res.json();
        toast.error(error.message || 'Error al seleccionar el logo');
      }
    } catch (error) {
      toast.error('Error al seleccionar el logo');
    }
  };

  const filteredItems = filter === 'all' 
    ? items 
    : filter === 'owned'
    ? items.filter(item => myItems.some(mi => mi.id === item.id))
    : items.filter(item => item.type === filter);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🛒 Tienda</h1>
              <p className="text-gray-300">Canjea tus puntos por logos y items exclusivos</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300 mb-1">Tus Monedas</p>
              <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full font-bold shadow-lg px-4 py-2 text-lg">
                <span>🪙</span>
                <span>{userCoins}</span>
                <span className="ml-1">MON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              filter === 'all' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-gray-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('LOGO')}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              filter === 'LOGO' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-gray-600'
            }`}
          >
            Logos
          </button>
          <button
            onClick={() => setFilter('owned')}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              filter === 'owned' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-gray-600'
            }`}
          >
            Mis Items
          </button>
        </div>

        {/* Grid de Items */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Cargando tienda...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                userPoints={userCoins}
                owned={myItems.some(mi => mi.id === item.id)}
                isSelected={selectedLogoId === item.id}
                onPurchase={handlePurchase}
                onSelect={handleSelectLogo}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 card">
            <p className="text-gray-400">No hay items disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}

