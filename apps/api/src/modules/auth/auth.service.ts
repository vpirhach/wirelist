import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthRequestDto } from './dto/auth-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRegistrationDto } from './dto/user-registration.dto';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Authenticate user and return JWT tokens
   */
  async authenticate(authRequest: AuthRequestDto): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for user: ${authRequest.username}`);

    const user = await this.validateUser(authRequest.username, authRequest.password);

    if (!user) {
      this.logger.warn(`Login failed for user: ${authRequest.username}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Login successful for user: ${authRequest.username}`);
    return this.generateAuthResponse(user);
  }

  /**
   * Register a new user
   */
  async registerUser(registrationDto: UserRegistrationDto): Promise<AuthResponseDto> {
    this.logger.log(`Registration attempt for user: ${registrationDto.username}`);

    // Check if username already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: registrationDto.username },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registrationDto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username: registrationDto.username,
        firstName: registrationDto.firstName,
        lastName: registrationDto.lastName,
        password: hashedPassword,
        role: registrationDto.role || UserRole.USER,
        isActive: true,
      },
    });

    this.logger.log(`Registration successful for user: ${registrationDto.username}`);
    return this.generateAuthResponse(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(payload.sub) },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: bigint, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed for user: ${user.username}`);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: bigint): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    this.logger.log(`User deactivated: ${user.username}`);
  }

  /**
   * Activate user account
   */
  async activateUser(userId: bigint): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    this.logger.log(`User activated: ${user.username}`);
  }

  /**
   * Validate user credentials
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  /**
   * Validate JWT token and return user
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(payload.sub) },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Generate JWT tokens for user
   */
  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: `${this.configService.get<number>('JWT_REFRESH_EXPIRATION')}ms`,
    });
  }

  /**
   * Generate complete auth response
   */
  generateAuthResponse(user: User): AuthResponseDto {
    return {
      accessToken: this.generateToken(user),
      refreshToken: this.generateRefreshToken(user),
      tokenType: 'Bearer',
      userId: user.id.toString(),
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
