import { IsString, IsNotEmpty } from 'class-validator';

export class UnlockAchievementDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  achievementCode: string;
}

