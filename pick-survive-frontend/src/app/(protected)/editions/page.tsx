'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';

interface Edition {
  id: string; 
  name: string; 
  status: string; 
  entryFeeCents: number; 
  potCents: number;
}

export default function EditionsPage() {
  const { user } = useAuth();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEditions = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.EDITIONS.LIST);
        if (!res.ok) throw new Error('No se pudieron cargar las ediciones.');
        const data = await res.json();
        setEditions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEditions();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar ediciones</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ediciones Disponibles</h1>
          <p className="text-gray-600">
            Únete a las ediciones activas y comienza a competir
          </p>
        </div>

        {/* User Balance */}
        {user && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Tu Saldo Disponible</h3>
                  <p className="text-green-100">Puedes unirte a ediciones con este saldo</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{(user.balanceCents / 100).toFixed(2)}€</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editions Grid */}
        {editions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
            <span className="text-6xl mb-4 block">🏆</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay ediciones disponibles</h3>
            <p className="text-gray-600">Vuelve más tarde para ver nuevas ediciones</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {editions.map((edition) => (
              <Link href={`/editions/${edition.id}`} key={edition.id} className="group">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  {/* Header de la tarjeta */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold truncate">{edition.name}</h3>
                      <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                        {edition.status === 'OPEN' ? 'Abierta' : edition.status}
                      </span>
                    </div>
                    <p className="text-blue-100 text-sm">Jornada de inicio: Próximamente</p>
                  </div>

                  {/* Contenido de la tarjeta */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Costo de entrada */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-bold">€</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Costo de entrada</p>
                            <p className="text-lg font-bold text-gray-900">
                              {(edition.entryFeeCents / 100).toFixed(2)}€
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bote actual */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <span className="text-yellow-600 font-bold">💰</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Bote actual</p>
                            <p className="text-lg font-bold text-yellow-600">
                              {(edition.potCents / 100).toFixed(2)}€
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botón de acción */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-blue-600 group-hover:text-blue-700">
                          <span className="font-medium">Ver detalles</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}