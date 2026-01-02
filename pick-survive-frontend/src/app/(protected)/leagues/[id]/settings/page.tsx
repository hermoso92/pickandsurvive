'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';
import { useToast } from '@/hooks/useToast';

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

interface League {
  id: string;
  name: string;
  defaultConfigJson: LeagueConfig;
  visibility: 'PRIVATE' | 'PUBLIC';
  members: Array<{
    userId: string;
    role: string;
    user: {
      id: string;
      alias: string;
      email: string;
    };
  }>;
}

export default function LeagueSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const toast = useToast();
  const leagueId = params.id as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<LeagueConfig>({
    entry_fee_cents: 0,
    timezone: 'Europe/Madrid',
    payout_schema: {
      type: 'winner_takes_all',
    },
    rules: {
      picks_hidden: true,
      no_repeat_team: true,
      lifeline_enabled: true,
      sudden_death: false,
      pick_deadline: 'FIRST_KICKOFF',
    },
    modes_enabled: ['ELIMINATORIO', 'LIGA'] as ('ELIMINATORIO' | 'LIGA')[],
  });

  useEffect(() => {
    if (token && leagueId) {
      fetchLeague();
    }
  }, [token, leagueId]);

  const fetchLeague = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.LEAGUES.DETAIL(leagueId), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al cargar la liga');
      const leagueData: League = await res.json();
      setLeague(leagueData);

      if (leagueData.defaultConfigJson) {
        setFormData(leagueData.defaultConfigJson as LeagueConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !league) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(API_ENDPOINTS.LEAGUES.UPDATE(leagueId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          defaultConfigJson: formData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al guardar configuración');
      }

      toast.success('✅ Configuración guardada exitosamente');
      await fetchLeague();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = () => {
    if (!league || !user) return false;
    const membership = league.members.find(m => m.userId === user.id);
    return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (error && !league) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">No tienes permisos para acceder a esta página</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Configuración de Liga</h1>
          <p className="text-gray-600 mt-2">{league?.name}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          {/* Cuota de Entrada */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuota de Entrada (céntimos)
            </label>
            <input
              type="number"
              min="0"
              value={formData.entry_fee_cents}
              onChange={(e) =>
                setFormData({ ...formData, entry_fee_cents: parseInt(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.entry_fee_cents / 100}€ por participante
            </p>
          </div>

          {/* Zona Horaria */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Zona Horaria</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Europe/Madrid">Europe/Madrid (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>

          {/* Esquema de Pago */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Esquema de Pago
            </label>
            <select
              value={formData.payout_schema.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payout_schema: {
                    type: e.target.value as 'winner_takes_all' | 'table',
                    ...(e.target.value === 'table' && { splits: [0.6, 0.3, 0.1] }),
                  },
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="winner_takes_all">Ganador se lleva todo</option>
              <option value="table">Distribución por tabla</option>
            </select>
          </div>

          {/* Reglas */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reglas de Juego</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rules.picks_hidden}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, picks_hidden: e.target.checked },
                    })
                  }
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Picks ocultos hasta el inicio del partido</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rules.no_repeat_team}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, no_repeat_team: e.target.checked },
                    })
                  }
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">No repetir equipo en jornadas consecutivas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rules.lifeline_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, lifeline_enabled: e.target.checked },
                    })
                  }
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Línea de vida habilitada</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rules.sudden_death}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, sudden_death: e.target.checked },
                    })
                  }
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Muerte súbita</span>
              </label>
            </div>
          </div>

          {/* Modos Habilitados */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Modos de Juego</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.modes_enabled.includes('ELIMINATORIO')}
                  onChange={(e) => {
                    const newModes = (e.target.checked
                      ? [...formData.modes_enabled, 'ELIMINATORIO']
                      : formData.modes_enabled.filter(m => m !== 'ELIMINATORIO')) as ('ELIMINATORIO' | 'LIGA')[];
                    if (newModes.length > 0) {
                      setFormData({ ...formData, modes_enabled: newModes });
                    }
                  }}
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Modo Eliminatorio</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.modes_enabled.includes('LIGA')}
                  onChange={(e) => {
                    const newModes = (e.target.checked
                      ? [...formData.modes_enabled, 'LIGA']
                      : formData.modes_enabled.filter(m => m !== 'LIGA')) as ('ELIMINATORIO' | 'LIGA')[];
                    if (newModes.length > 0) {
                      setFormData({ ...formData, modes_enabled: newModes });
                    }
                  }}
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Modo Liga</span>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

