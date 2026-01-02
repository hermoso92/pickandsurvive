const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeUserMaster() {
  try {
    const userId = 'cmipy37eq0000dqq47n7r51uj';
    
    console.log('🔍 Verificando usuario actual...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, alias: true }
    });

    if (!user) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log(`📧 Email actual: ${user.email}`);
    console.log(`👤 Alias: ${user.alias || 'Sin alias'}`);

    // Verificar si ya existe un usuario con ese email
    const existingMaster = await prisma.user.findUnique({
      where: { email: 'master@pickandsurvive.com' }
    });

    if (existingMaster && existingMaster.id !== userId) {
      console.log(`\n⚠️  Ya existe otro usuario con el email master@pickandsurvive.com`);
      console.log(`   ID del usuario existente: ${existingMaster.id}`);
      console.log(`   Cambiando el email del usuario existente a master-old-${existingMaster.id}@pickandsurvive.com...`);
      
      await prisma.user.update({
        where: { id: existingMaster.id },
        data: { email: `master-old-${existingMaster.id}@pickandsurvive.com` }
      });
      
      console.log('✅ Email del usuario anterior actualizado');
    }

    console.log('\n🔄 Actualizando email a master@pickandsurvive.com...');
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: 'master@pickandsurvive.com' },
      select: { id: true, email: true, alias: true }
    });

    console.log('✅ Usuario actualizado exitosamente:');
    console.log(`   ID: ${updated.id}`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Alias: ${updated.alias || 'Sin alias'}`);
    console.log('\n🎉 El usuario ahora es MAESTRO y puede acceder a todas las funciones de administración');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserMaster();
