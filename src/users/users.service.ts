import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
  }

  async resetPassword(email: string): Promise<User> {
    // Генерируем новый временный пароль
    const newPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const user = await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    // В реальном приложении здесь нужно отправить email с новым паролем
    // Для упрощения просто логируем его
    console.log(`Новый пароль для ${email}: ${newPassword}`);

    return user;
  }

  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
