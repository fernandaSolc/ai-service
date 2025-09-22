import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('API key não fornecida');
    }

    const validApiKey = this.configService.get<string>('API_KEY');
    if (!validApiKey) {
      throw new UnauthorizedException('API key não configurada no servidor');
    }

    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('API key inválida');
    }

    // Adicionar informações do usuário ao request
    request.user = {
      id: 'internal-service',
      type: 'api-key',
      scope: ['ia:process', 'ia:admin'],
    };

    return true;
  }
}
