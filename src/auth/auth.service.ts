import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new UnauthorizedException('Пользователь с таким email уже существует');
    }

    const user = await this.usersService.create(dto.email, dto.password);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email },
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email },
      token,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Пользователь с таким email не найден');
    }

    await this.usersService.resetPassword(dto.email);

    return {
      message: 'Пароль успешно сброшен. Новый пароль отправлен на вашу почту.',
    };
  }
}
