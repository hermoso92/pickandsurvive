import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // De momento, no necesitamos más rutas aquí.
  // La creación de usuarios se maneja en AuthController.
  // Más adelante podríamos añadir rutas como GET /users/me para obtener el perfil del usuario.
}