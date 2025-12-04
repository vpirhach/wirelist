import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { User } from '@prisma/client';

/**
 * Extended JWT Payload to support both Java and Node.js backend token formats
 * Java backend: sub = username, userId in claims
 * Node.js backend: sub = user ID as string
 */
interface ExtendedJwtPayload extends JwtPayload {
  userId?: number | string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: ExtendedJwtPayload): Promise<User> {
    let user: User | null = null;

    // Try to get user ID from different sources (support both backends)
    const subAsNumber = Number(payload.sub);

    // 1. Node.js format: sub is a valid number (user ID)
    if (!isNaN(subAsNumber) && subAsNumber > 0) {
      this.logger.debug(`Using sub as user ID: ${payload.sub}`);
      user = await this.authService.getUserById(BigInt(payload.sub));
    }

    // 2. Java format: userId in claims
    if (!user && payload.userId) {
      this.logger.debug(`Using userId from claims: ${payload.userId}`);
      user = await this.authService.getUserById(BigInt(payload.userId));
    }

    // 3. Java format: lookup by username from claims
    if (!user && payload.username) {
      this.logger.debug(`Looking up user by username: ${payload.username}`);
      user = await this.prisma.user.findUnique({
        where: { username: payload.username },
      });
    }

    // 4. Java format fallback: sub is username (not a number)
    if (!user && payload.sub && isNaN(subAsNumber)) {
      this.logger.debug(`Using sub as username: ${payload.sub}`);
      user = await this.prisma.user.findUnique({
        where: { username: payload.sub },
      });
    }

    if (!user) {
      this.logger.warn(`User not found for token payload: ${JSON.stringify(payload)}`);
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      this.logger.warn(`Inactive user attempted access: ${user.username}`);
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }
}
