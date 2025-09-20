import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface CallbackPayload {
  workflowId: string;
  status: 'completed' | 'error';
  payload?: any;
  execution?: any;
  error?: string;
}

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  /**
   * Envia callback para URL fornecida
   */
  async sendCallback(callbackUrl: string, payload: CallbackPayload): Promise<boolean> {
    try {
      this.logger.log(`Enviando callback para: ${callbackUrl}`);
      
      const response: AxiosResponse = await axios.post(callbackUrl, payload, {
        timeout: 10000, // 10 segundos
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ia-service/1.0.0',
        },
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Callback enviado com sucesso para: ${callbackUrl}`);
        return true;
      } else {
        this.logger.warn(`Callback retornou status ${response.status} para: ${callbackUrl}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar callback para ${callbackUrl}:`, error.message);
      return false;
    }
  }

  /**
   * Testa se uma URL de callback está acessível
   */
  async testCallback(callbackUrl: string, testPayload: any): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Testando callback para: ${callbackUrl}`);
      
      const response = await axios.post(callbackUrl, testPayload, {
        timeout: 5000, // 5 segundos para teste
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ia-service/1.0.0',
        },
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: `Callback testado com sucesso. Status: ${response.status}`,
        };
      } else {
        return {
          success: false,
          message: `Callback retornou status inesperado: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro ao testar callback: ${error.message}`,
      };
    }
  }

  /**
   * Valida se uma URL de callback é válida
   */
  validateCallbackUrl(url: string): { valid: boolean; message: string } {
    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return {
          valid: false,
          message: 'URL deve usar protocolo HTTP ou HTTPS',
        };
      }

      if (!parsedUrl.hostname) {
        return {
          valid: false,
          message: 'URL deve ter um hostname válido',
        };
      }

      return {
        valid: true,
        message: 'URL válida',
      };
    } catch (error) {
      return {
        valid: false,
        message: 'URL inválida',
      };
    }
  }
}
