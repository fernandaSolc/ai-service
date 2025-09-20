import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  /**
   * Valida token JWT
   */
  async validateJwtToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Token JWT inválido');
    }
  }

  /**
   * Valida API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    const validApiKey = this.configService.get<string>('API_KEY');
    if (!validApiKey) {
      throw new UnauthorizedException('API key não configurada');
    }
    
    return apiKey === validApiKey;
  }

  /**
   * Gera token JWT para testes
   */
  generateTestToken(payload: any): string {
    return this.jwtService.sign(payload);
  }
}
