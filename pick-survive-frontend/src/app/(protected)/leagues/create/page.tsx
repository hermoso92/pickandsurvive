'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';

interface LeagueConfig {
  entry_fee_cents: number;
  timezone: string;
  payout_schema: {
    type: 'winner_takes_all' | 'table';
    splits?: number[];
  };
  rules: {
    picks_hidden: boolean;
    no_repeat_team: boolean;
    lifeline_enabled: boolean;
    sudden_death: boolean;
    pick_deadline: 'FIRST_KICKOFF';
  };
  modes_enabled: ('ELIMINATORIO' | 'LIGA')[];
}

export default function CreateLeaguePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    visibility: 'PRIVATE' as 'PRIVATE' | 'PUBLIC',
    entry_fee_cents: 500,
    timezone: 'Europe/Madrid',
    payout_type: 'winner_takes_all' as 'winner_takes_all' | 'table',
    picks_hidden: true,
    no_repeat_team: true,
    lifeline_enabled: true,
    sudden_death: false,
    modes_enabled: ['ELIMINATORIO', 'LIGA'] as ('ELIMINATORIO' | 'LIGA')[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar que haya al menos un modo seleccionado
      if (formData.modes_enabled.length === 0) {
        setError('Debes seleccionar al menos un modo de juego');
        setLoading(false);
        return;
      }

      // Construir configuración por defecto
      const defaultConfig: LeagueConfig = {
        entry_fee_cents: formData.entry_fee_cents,
        timezone: formData.timezone,
        payout_schema: {
          type: formData.payout_type,
          ...(formData.payout_type === 'table' && { splits: [0.6, 0.3, 0.1] }),
        },
        rules: {
          picks_hidden: formData.picks_hidden,
          no_repeat_team: formData.no_repeat_team,
          lifeline_enabled: formData.lifeline_enabled,
          sudden_death: formData.sudden_death,
          pick_deadline: 'FIRST_KICKOFF',
        },
        modes_enabled: formData.modes_enabled,
      };

      const response = await fetch(API_ENDPOINTS.LEAGUES.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          defaultConfigJson: defaultConfig,
          visibility: formData.visibility,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la liga');
      }

      const newLeague = await response.json();
      setSuccess(`¡Liga "${formData.name}" creada exitosamente!`);
      
      // Redirigir a la página de gestión de la liga después de 2 segundos
      setTimeout(() => {
        router.push(`/leagues/${newLeague.id}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'entry_fee_cents') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleModeToggle = (mode: 'ELIMINATORIO' | 'LIGA') => {
    setFormData(prev => {
      const newModes = prev.modes_enabled.includes(mode)
        ? prev.modes_enabled.filter(m => m !== mode)
        : [...prev.modes_enabled, mode];
      
      // Asegurar que siempre haya al menos un modo seleccionado
      if (newModes.length === 0) {
        return prev; // No permitir desmarcar el último modo
      }
      
      return {
        ...prev,
        modes_enabled: newModes
      };
    });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Crear Nueva Liga</h1>
          <p className="text-gray-300">Configura tu liga privada y define las reglas por defecto</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8">
            {/* Información básica */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Información Básica</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Liga *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Liga de Oficina"
                  />
                </div>

                <div>
                  <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-2">
                    Visibilidad
                  </label>
                  <select
                    id="visibility"
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PRIVATE">🔒 Privada (Solo invitados)</option>
                    <option value="PUBLIC">🌐 Pública (Cualquiera puede unirse)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Configuración económica */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuración Económica</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="entry_fee_cents" className="block text-sm font-medium text-gray-700 mb-2">
                    Cuota de Entrada (€)
                  </label>
                  <input
                    type="number"
                    id="entry_fee_cents"
                    name="entry_fee_cents"
                    value={formData.entry_fee_cents / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_fee_cents: (parseFloat(e.target.value) || 0) * 100 }))}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="payout_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Esquema de Premios
                  </label>
                  <select
                    id="payout_type"
                    name="payout_type"
                    value={formData.payout_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="winner_takes_all">🏆 Ganador se lleva todo</option>
                    <option value="table">📊 Distribución por tabla</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modos de juego */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Modos de Juego</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="eliminatorio"
                    checked={formData.modes_enabled.includes('ELIMINATORIO')}
                    onChange={() => handleModeToggle('ELIMINATORIO')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="eliminatorio" className="ml-3 text-sm font-medium text-gray-700">
                    🎯 Eliminatorio (Supervivencia)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="liga"
                    checked={formData.modes_enabled.includes('LIGA')}
                    onChange={() => handleModeToggle('LIGA')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="liga" className="ml-3 text-sm font-medium text-gray-700">
                    📊 Liga (Por puntos)
                  </label>
                </div>
              </div>
            </div>

            {/* Reglas */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reglas por Defecto</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="picks_hidden"
                    name="picks_hidden"
                    checked={formData.picks_hidden}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="picks_hidden" className="ml-3 text-sm font-medium text-gray-700">
                    🔒 Picks ocultos hasta que todos hayan elegido
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="no_repeat_team"
                    name="no_repeat_team"
                    checked={formData.no_repeat_team}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="no_repeat_team" className="ml-3 text-sm font-medium text-gray-700">
                    🚫 No repetir equipo en ediciones consecutivas
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="lifeline_enabled"
                    name="lifeline_enabled"
                    checked={formData.lifeline_enabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="lifeline_enabled" className="ml-3 text-sm font-medium text-gray-700">
                    💊 Línea de vida habilitada (solo Eliminatorio)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sudden_death"
                    name="sudden_death"
                    checked={formData.sudden_death}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sudden_death" className="ml-3 text-sm font-medium text-gray-700">
                    ⚡ Muerte súbita habilitada (solo Eliminatorio)
                  </label>
                </div>
              </div>
            </div>

            {/* Mensajes de estado */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="text-red-400">⚠️</div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <div className="text-green-400">✅</div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Liga'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
