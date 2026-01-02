import { PrismaClient } from '@prisma/client';
import { PointsService } from '../points/points.service';
import { CoinsService } from '../coins/coins.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const pointsService = new PointsService(prismaService);
const coinsService = new CoinsService(prismaService);

async function awardRetroactivePoints() {
  console.log('🎁 Iniciando otorgamiento retroactivo de puntos y monedas...');

  try {
    // Obtener todas las ediciones finalizadas o en progreso
    const editions = await prisma.edition.findMany({
      where: {
        status: {
          in: ['IN_PROGRESS', 'FINALIZED'],
        },
      },
      include: {
        participants: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            user: true,
            picks: {
              include: {
                match: true,
                team: true,
              },
            },
          },
        },
      },
    });

    console.log(`📊 Encontradas ${editions.length} ediciones para procesar`);

    for (const edition of editions) {
      console.log(`\n📅 Procesando edición: ${edition.name} (${edition.id})`);

      // Agrupar picks por jornada
      const picksByMatchday = new Map<number, typeof edition.participants[0]['picks']>();

      for (const participant of edition.participants) {
        for (const pick of participant.picks) {
          if (!picksByMatchday.has(pick.matchday)) {
            picksByMatchday.set(pick.matchday, []);
          }
          picksByMatchday.get(pick.matchday)!.push(pick);
        }
      }

      // Procesar cada jornada
      for (const [matchday, picks] of picksByMatchday.entries()) {
        console.log(`  📍 Jornada ${matchday}: ${picks.length} picks`);

        // Obtener el partido de esta jornada (asumimos que todos los picks de la misma jornada son del mismo partido)
        const firstPick = picks[0];
        if (!firstPick.match || firstPick.match.status !== 'FINISHED') {
          console.log(`    ⏭️  Partido no finalizado, saltando...`);
          continue;
        }

        const match = firstPick.match;
        if (match.homeGoals === null || match.awayGoals === null) {
          console.log(`    ⏭️  Partido sin resultado, saltando...`);
          continue;
        }

        // Determinar equipo ganador
        const winningTeamId =
          match.homeGoals > match.awayGoals
            ? match.homeTeamId
            : match.awayGoals > match.homeGoals
              ? match.awayTeamId
              : null; // Empate

        if (!winningTeamId) {
          console.log(`    ⚠️  Empate, ningún pick es correcto`);
          continue;
        }

        // Verificar picks correctos y otorgar recompensas
        for (const pick of picks) {
          const participant = edition.participants.find(p => p.picks.some(pp => pp.id === pick.id));
          if (!participant) continue;

          // Verificar si el pick es correcto
          const isCorrect = pick.teamId === winningTeamId;

          if (isCorrect && participant.status === 'ACTIVE') {
            // Verificar si ya se otorgaron puntos/monedas para este pick
            const existingPoints = await prisma.pointTransaction.findFirst({
              where: {
                userId: participant.userId,
                editionId: edition.id,
                matchday: matchday,
                type: 'MATCHDAY_WIN',
              },
            });

            if (!existingPoints) {
              try {
                // Otorgar puntos
                await pointsService.awardMatchdayPoints(
                  participant.userId,
                  edition.id,
                  matchday,
                  10
                );
                console.log(
                  `    ✅ Otorgados 10 puntos a ${participant.user.alias || participant.user.email} por jornada ${matchday}`
                );

                // Otorgar monedas
                await coinsService.awardMatchdayCoins(
                  participant.userId,
                  edition.id,
                  matchday,
                  10
                );
                console.log(
                  `    💰 Otorgadas 10 monedas a ${participant.user.alias || participant.user.email} por jornada ${matchday}`
                );
              } catch (error) {
                console.error(
                  `    ❌ Error otorgando recompensas a ${participant.userId}:`,
                  error
                );
              }
            } else {
              console.log(
                `    ℹ️  Ya se otorgaron recompensas a ${participant.user.alias || participant.user.email} para jornada ${matchday}`
              );
            }
          }
        }
      }
    }

    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  awardRetroactivePoints()
    .then(() => {
      console.log('🎉 Script finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { awardRetroactivePoints };

