// Script para crear usuario en la base de datos
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser() {
  const email = 'antoniohermoso92@gmail.com';
  const password = 'Antonio123'; // Contraseña por defecto
  const alias = 'Antonio';

  try {
    console.log('🔍 Verificando si el usuario ya existe...');
    
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  El usuario ya existe:', email);
      console.log('   ID:', existingUser.id);
      console.log('   Alias:', existingUser.alias);
      return existingUser;
    }

    console.log('🔐 Encriptando contraseña...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('👤 Creando usuario...');
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        alias,
      },
    });

    console.log('✅ Usuario creado exitosamente!');
    console.log('');
    console.log('📋 Detalles del usuario:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Alias:', user.alias);
    console.log('   Creado:', user.createdAt);
    console.log('');
    console.log('🔑 Credenciales de acceso:');
    console.log('   Email:', email);
    console.log('   Contraseña:', password);
    console.log('');
    console.log('🚀 Puedes iniciar sesión en: http://localhost:5174/login');

    return user;
  } catch (error) {
    console.error('❌ Error al crear usuario:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createUser()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

