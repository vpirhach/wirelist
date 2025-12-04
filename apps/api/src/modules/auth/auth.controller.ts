import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '@prisma/client';
import { AuthRequestDto } from './dto/auth-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRegistrationDto } from './dto/user-registration.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * Authentication Controller for handling user authentication and authorization.
 *
 * This controller provides endpoints for:
 * - User login and token generation
 * - User registration
 * - Token refresh operations
 * - User profile management
 * - Password management
 *
 * Security features:
 * - JWT token-based authentication
 * - Role-based access control
 * - Input validation
 * - Comprehensive error handling
 */
@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate user with username and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() authRequest: AuthRequestDto): Promise<AuthResponseDto> {
    return this.authService.authenticate(authRequest);
  }

  /**
   * Register new user account
   */
  @Post('register')
  @ApiOperation({ summary: 'User registration', description: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - username exists or validation failed' })
  async register(@Body() registrationDto: UserRegistrationDto): Promise<AuthResponseDto> {
    return this.authService.registerUser(registrationDto);
  }

  /**
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh token',
    description: 'Generate new access token using refresh token',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Get current authenticated user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get current authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Change user password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password', description: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );

    return { message: 'Password changed successfully' };
  }

  /**
   * Admin endpoint to deactivate user account
   */
  @Post('admin/deactivate/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Deactivate user (Admin only)',
    description: 'Deactivate user account',
  })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 400, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deactivateUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ message: string }> {
    await this.authService.deactivateUser(BigInt(userId));
    return { message: 'User deactivated successfully' };
  }

  /**
   * Admin endpoint to activate user account
   */
  @Post('admin/activate/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Activate user (Admin only)',
    description: 'Activate user account',
  })
  @ApiResponse({ status: 200, description: 'User activated' })
  @ApiResponse({ status: 400, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async activateUser(@Param('userId', ParseIntPipe) userId: number): Promise<{ message: string }> {
    await this.authService.activateUser(BigInt(userId));
    return { message: 'User activated successfully' };
  }

  /**
   * Validate JWT token endpoint
   */
  @Get('validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate token', description: 'Validate current JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async validateToken(@CurrentUser() user: User) {
    return {
      valid: true,
      userId: user.id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
    };
  }
}
