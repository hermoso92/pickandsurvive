import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Limpiar datos antiguos
  await prisma.pick.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.edition.deleteMany();

  // Crear equipos de LaLiga (ejemplo)
  const realMadrid = await prisma.team.create({ data: { name: 'Real Madrid', shortName: 'RMA' } });
  const barcelona = await prisma.team.create({ data: { name: 'FC Barcelona', shortName: 'BAR' } });
  const atletico = await prisma.team.create({ data: { name: 'Atlético de Madrid', shortName: 'ATM' } });
  const sevilla = await prisma.team.create({ data: { name: 'Sevilla FC', shortName: 'SEV' } });
  const valencia = await prisma.team.create({ data: { name: 'Valencia CF', shortName: 'VAL' } });
  const betis = await prisma.team.create({ data: { name: 'Real Betis', shortName: 'BET' } });
  const villarreal = await prisma.team.create({ data: { name: 'Villarreal CF', shortName: 'VIL' } });
  const sociedad = await prisma.team.create({ data: { name: 'Real Sociedad', shortName: 'RSO' } });
  
  console.log('Created teams.');

  // Crear partidos para la jornada 10
  const match1 = await prisma.match.create({
    data: {
      matchday: 10,
      kickoffAt: new Date('2025-10-25T19:00:00Z'), // Sábado a las 21:00 de Madrid
      homeTeamId: realMadrid.id,
      awayTeamId: sevilla.id,
    },
  });
  const match2 = await prisma.match.create({
    data: {
      matchday: 10,
      kickoffAt: new Date('2025-10-26T19:00:00Z'), // Domingo a las 21:00 de Madrid
      homeTeamId: barcelona.id,
      awayTeamId: atletico.id,
    },
  });
  const match3 = await prisma.match.create({
    data: {
      matchday: 10,
      kickoffAt: new Date('2025-10-26T17:00:00Z'), // Domingo a las 19:00 de Madrid
      homeTeamId: valencia.id,
      awayTeamId: betis.id,
    },
  });
  const match4 = await prisma.match.create({
    data: {
      matchday: 10,
      kickoffAt: new Date('2025-10-27T20:00:00Z'), // Lunes a las 22:00 de Madrid
      homeTeamId: villarreal.id,
      awayTeamId: sociedad.id,
    },
  });

  console.log('Created matches.');

  // No crear ligas ni ediciones de prueba - los usuarios las crearán manualmente

  // Crear logros predefinidos (solo si no existen)
  const achievements = [
    // Logros de Victoria
    { code: 'FIRST_WIN', name: 'Primera Victoria', description: 'Gana tu primera jornada', icon: '🎯', pointsReward: 10, category: 'WINNING', rarity: 'COMMON' },
    { code: 'WIN_STREAK_3', name: 'Racha de 3', description: 'Gana 3 jornadas seguidas', icon: '🔥', pointsReward: 25, category: 'STREAK', rarity: 'COMMON' },
    { code: 'WIN_STREAK_5', name: 'Racha de 5', description: 'Gana 5 jornadas seguidas', icon: '⚡', pointsReward: 50, category: 'STREAK', rarity: 'RARE' },
    { code: 'WIN_STREAK_10', name: 'Racha de 10', description: 'Gana 10 jornadas seguidas', icon: '💎', pointsReward: 100, category: 'STREAK', rarity: 'EPIC' },
    { code: 'PERFECT_WEEK', name: 'Semana Perfecta', description: '7 jornadas correctas en una semana', icon: '⭐', pointsReward: 75, category: 'WINNING', rarity: 'RARE' },
    
    // Logros de Participación
    { code: 'PARTICIPANT_5', name: 'Participante Activo', description: 'Participa en 5 ediciones', icon: '👤', pointsReward: 15, category: 'PARTICIPATION', rarity: 'COMMON' },
    { code: 'PARTICIPANT_10', name: 'Veterano', description: 'Participa en 10 ediciones', icon: '🏅', pointsReward: 30, category: 'PARTICIPATION', rarity: 'COMMON' },
    { code: 'PARTICIPANT_25', name: 'Leyenda', description: 'Participa en 25 ediciones', icon: '👑', pointsReward: 75, category: 'PARTICIPATION', rarity: 'RARE' },
    
    // Logros de Puntos
    { code: 'POINTS_100', name: 'Centenario', description: 'Acumula 100 puntos', icon: '💯', pointsReward: 20, category: 'SPECIAL', rarity: 'COMMON' },
    { code: 'POINTS_500', name: 'Quinientos', description: 'Acumula 500 puntos', icon: '🎖️', pointsReward: 50, category: 'SPECIAL', rarity: 'RARE' },
    { code: 'POINTS_1000', name: 'Mil Puntos', description: 'Acumula 1000 puntos', icon: '🏆', pointsReward: 100, category: 'SPECIAL', rarity: 'EPIC' },
    
    // Logros Especiales
    { code: 'CHAMPION', name: 'Campeón', description: 'Gana una edición completa', icon: '👑', pointsReward: 200, category: 'SPECIAL', rarity: 'LEGENDARY' },
    { code: 'UNDEFEATED', name: 'Invicto', description: 'Gana edición sin fallar ninguna jornada', icon: '🛡️', pointsReward: 150, category: 'SPECIAL', rarity: 'LEGENDARY' },
    { code: 'COMEBACK', name: 'Remontada', description: 'Vuelve a ganar después de 3 derrotas', icon: '📈', pointsReward: 50, category: 'SPECIAL', rarity: 'RARE' },
  ];

  for (const achievement of achievements) {
    try {
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        update: achievement,
        create: achievement,
      });
    } catch (error) {
      console.error(`Error creando logro ${achievement.code}:`, error);
    }
  }

  console.log('Created achievements.');

  // Crear items de tienda
  const shopItems = [
    { code: 'LOGO_DEFAULT', name: 'Logo Predeterminado', description: 'Logo básico del sistema', type: 'LOGO', pricePoints: 0, isActive: true },
    { code: 'LOGO_CLASSIC', name: 'Logo Clásico', description: 'Un logo con estilo clásico', type: 'LOGO', pricePoints: 50, isActive: true },
    { code: 'LOGO_MODERN', name: 'Logo Moderno', description: 'Un logo con diseño moderno', type: 'LOGO', pricePoints: 100, isActive: true },
    { code: 'LOGO_ELITE', name: 'Logo Élite', description: 'Logo exclusivo para jugadores destacados', type: 'LOGO', pricePoints: 500, isActive: true },
    { code: 'LOGO_LEGENDARY', name: 'Logo Legendario', description: 'El logo más exclusivo', type: 'LOGO', pricePoints: 1000, isActive: true },
    { code: 'LOGO_CUSTOM', name: 'Logo Personalizado', description: 'Logo completamente personalizado', type: 'LOGO', pricePoints: 2000, isActive: true },
  ];

  for (const item of shopItems) {
    try {
      await prisma.shopItem.upsert({
        where: { code: item.code },
        update: item,
        create: item,
      });
    } catch (error) {
      console.error(`Error creando item ${item.code}:`, error);
    }
  }

  console.log('Created shop items.');

  console.log('Seeding finished.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
  }).finally(async () => {
    await prisma.$disconnect();
  });