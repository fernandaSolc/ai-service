import { Injectable, BadRequestException } from '@nestjs/common';
import { ProcessRequestDto, PolicyDto } from '../../common/dto';

@Injectable()
export class ValidationService {
  /**
   * Valida o payload de entrada contra as regras de negócio
   */
  validateProcessRequest(request: ProcessRequestDto): void {
    // Validar workflowId
    if (!request.workflowId || typeof request.workflowId !== 'string') {
      throw new BadRequestException('workflowId é obrigatório e deve ser uma string');
    }

    // Validar text
    if (!request.text || typeof request.text !== 'string' || request.text.trim().length === 0) {
      throw new BadRequestException('text é obrigatório e não pode estar vazio');
    }

    // Validar metadata
    if (!request.metadata) {
      throw new BadRequestException('metadata é obrigatório');
    }

    if (!request.metadata.title || !request.metadata.discipline || !request.metadata.courseId || !request.metadata.language) {
      throw new BadRequestException('metadata deve conter title, discipline, courseId e language');
    }

    // Validar mode
    if (request.mode === 'async' && !request.callbackUrl) {
      throw new BadRequestException('callbackUrl é obrigatório para modo async');
    }

    // Validar callbackUrl se fornecido
    if (request.callbackUrl) {
      try {
        new URL(request.callbackUrl);
      } catch {
        throw new BadRequestException('callbackUrl deve ser uma URL válida');
      }
    }
  }

  /**
   * Valida políticas de conteúdo
   */
  validatePolicy(policy?: PolicyDto): void {
    if (!policy) return;

    // Validar termos obrigatórios
    if (policy.requiredTerms && !Array.isArray(policy.requiredTerms)) {
      throw new BadRequestException('requiredTerms deve ser um array');
    }

    // Validar termos proibidos
    if (policy.forbiddenTerms && !Array.isArray(policy.forbiddenTerms)) {
      throw new BadRequestException('forbiddenTerms deve ser um array');
    }

    // Validar diretrizes de estilo
    if (policy.styleGuidelines && !Array.isArray(policy.styleGuidelines)) {
      throw new BadRequestException('styleGuidelines deve ser um array');
    }
  }

  /**
   * Sanitiza o texto de entrada para evitar injeção de HTML/JS
   */
  sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Valida se o texto contém termos proibidos
   */
  checkForbiddenTerms(text: string, forbiddenTerms: string[] = []): { rule: string; message: string; severity: 'low' | 'medium' | 'high' }[] {
    const violations: { rule: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    const lowerText = text.toLowerCase();

    for (const term of forbiddenTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        violations.push({
          rule: 'forbidden_term',
          message: `Termo proibido encontrado: "${term}"`,
          severity: 'high' as const,
        });
      }
    }

    return violations;
  }

  /**
   * Valida se o texto contém termos obrigatórios
   */
  checkRequiredTerms(text: string, requiredTerms: string[] = []): { rule: string; message: string; severity: 'low' | 'medium' | 'high' }[] {
    const violations: { rule: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    const lowerText = text.toLowerCase();

    for (const term of requiredTerms) {
      if (!lowerText.includes(term.toLowerCase())) {
        violations.push({
          rule: 'missing_required_term',
          message: `Termo obrigatório não encontrado: "${term}"`,
          severity: 'medium' as const,
        });
      }
    }

    return violations;
  }
}
