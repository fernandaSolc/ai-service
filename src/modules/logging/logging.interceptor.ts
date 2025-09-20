import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const requestId = request.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = request.user?.id || request.headers['x-user-id'];
    
    // Log da requisição
    this.logger.log({
      requestId,
      userId,
      message: `Iniciando requisição ${request.method} ${request.url}`,
      timestamp: new Date().toISOString(),
      level: 'info',
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        
        this.logger.log({
          requestId,
          userId,
          status: statusCode.toString(),
          duration,
          message: `Requisição finalizada com status ${statusCode} em ${duration}ms`,
          timestamp: new Date().toISOString(),
          level: 'info',
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        this.logger.error({
          requestId,
          userId,
          status: 'error',
          duration,
          error: error.message,
          message: `Erro na requisição: ${error.message}`,
          timestamp: new Date().toISOString(),
          level: 'error',
        });
        
        throw error;
      }),
    );
  }
}
