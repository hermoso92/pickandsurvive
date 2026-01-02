import { IsEmail } from 'class-validator';

export class CreateInviteDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;
}

