'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';
import { useToast } from '@/hooks/useToast';

interface LedgerEntry {
  id: string;
  type: string;
  amountCents: number;
  createdAt: string;
  edition?: {
    id: string;
    name: string;
  };
  league?: {
    id: string;
    name: string;
  };
  metaJson?: any;
}

export default function LedgerPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (token) {
      loadLedger();
    }
  }, [token]);

  const loadLedger = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Cargar balance
      const balanceRes = await fetch(API_ENDPOINTS.ME.BALANCE, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balanceCents || 0);
      }

      // Cargar historial
      const ledgerRes = await fetch(API_ENDPOINTS.ME.LEDGER, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setEntries(ledgerData);
      }
    } catch (error) {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter(entry => entry.type === filter);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ENTRY_FEE': 'Cuota de Entrada',
      'PRIZE_PAYOUT': 'Pago de Premio',
      'ROLLOVER_OUT': 'Bote Saliente',
      'ROLLOVER_IN': 'Bote Entrante',
      'ADJUSTMENT': 'Ajuste',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'ENTRY_FEE': '💸',
      'PRIZE_PAYOUT': '💰',
      'ROLLOVER_OUT': '📤',
      'ROLLOVER_IN': '📥',
      'ADJUSTMENT': '⚙️',
    };
    return icons[type] || '📝';
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Historial de Transacciones</h1>
          <p className="text-gray-600">Registro completo de todas tus transacciones financieras</p>
        </div>

        {/* Balance Actual */}
        <div className="mb-8 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Saldo Actual</p>
              <p className="text-4xl font-bold">{(balance / 100).toFixed(2)} €</p>
            </div>
            <div className="text-6xl opacity-50">💳</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Tipo</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="ENTRY_FEE">Cuotas de Entrada</option>
            <option value="PRIZE_PAYOUT">Premios</option>
            <option value="ROLLOVER_OUT">Botes Salientes</option>
            <option value="ROLLOVER_IN">Botes Entrantes</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </select>
        </div>

        {/* Tabla de Transacciones */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando historial...</p>
          </div>
        ) : filteredEntries.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edición/Liga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{getTypeIcon(entry.type)}</span>
                          <span className="text-sm text-gray-900">{getTypeLabel(entry.type)}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                        entry.amountCents > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.amountCents > 0 ? '+' : ''}{(entry.amountCents / 100).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.edition?.name || entry.league?.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
            <p className="text-gray-500">No hay transacciones registradas</p>
          </div>
        )}
      </div>
    </div>
  );
}

