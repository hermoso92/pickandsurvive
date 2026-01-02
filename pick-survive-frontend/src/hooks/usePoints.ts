import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { API_ENDPOINTS } from '@/config/api';
import { createLogger } from '@/utils/logger';

const logger = createLogger('usePoints');

export interface PointsData {
  totalPoints: number; // Suma de todas las ediciones
  editionPoints: number; // Puntos de la edición activa
  activeEditionId: string | null;
  activeEditionName: string | null;
}

export const usePoints = (activeEditionId?: string | null) => {
  const { token } = useAuth();
  const [pointsData, setPointsData] = useState<PointsData>({
    totalPoints: 0,
    editionPoints: 0,
    activeEditionId: null,
    activeEditionName: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoints = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener mi posición en el ranking global que calcula correctamente la suma de todas las ediciones
      const myRankRes = await fetch(`${API_ENDPOINTS.RANKINGS.ME}?scope=global`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      let totalPoints = 0;
      if (myRankRes.ok) {
        const myRankData = await myRankRes.json();
        totalPoints = myRankData.totalPoints || 0;
      } else {
        // Fallback: usar el endpoint de puntos si falla
        const pointsRes = await fetch(API_ENDPOINTS.POINTS.ME, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (pointsRes.ok) {
          const pointsData = await pointsRes.json();
          totalPoints = pointsData.totalPoints || 0;
        }
      }

      // Si hay una edición activa, cargar sus puntos
      let editionPoints = 0;
      let activeEditionName = null;

      if (activeEditionId) {
        const editionRes = await fetch(API_ENDPOINTS.POINTS.EDITION(activeEditionId), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (editionRes.ok) {
          const editionData = await editionRes.json();
          editionPoints = editionData.points || 0;

          // Obtener nombre de la edición
          const editionDetailRes = await fetch(API_ENDPOINTS.EDITIONS.DETAIL(activeEditionId), {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (editionDetailRes.ok) {
            const editionDetail = await editionDetailRes.json();
            activeEditionName = editionDetail.name || null;
          }
        }
      }

      setPointsData({
        totalPoints,
        editionPoints,
        activeEditionId: activeEditionId || null,
        activeEditionName,
      });
    } catch (err) {
      logger.error('Error en fetchPoints', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [token, activeEditionId]);

  useEffect(() => {
    if (token) {
      fetchPoints();
    }
  }, [token, activeEditionId, fetchPoints]);

  return {
    pointsData,
    loading,
    error,
    fetchPoints,
  };
};

