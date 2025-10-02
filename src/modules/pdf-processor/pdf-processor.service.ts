import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

export interface PdfDownloadResult {
    success: boolean;
    content?: string;
    size?: number;
    error?: string;
    url?: string;
}

export interface PdfProcessingOptions {
    maxSize?: number; // em bytes (padrão: 10MB)
    timeout?: number; // em ms (padrão: 5 minutos)
    tempDir?: string; // diretório temporário
}

@Injectable()
export class PdfProcessorService {
    private readonly logger = new Logger(PdfProcessorService.name);
    private readonly defaultOptions: PdfProcessingOptions = {
        maxSize: 10 * 1024 * 1024, // 10MB
        timeout: 5 * 60 * 1000, // 5 minutos
        tempDir: '/tmp'
    };

    /**
     * Baixa e processa um PDF a partir de uma URL
     */
    async downloadAndProcessPdf(
        url: string,
        options: PdfProcessingOptions = {}
    ): Promise<PdfDownloadResult> {
        const opts = { ...this.defaultOptions, ...options };

        this.logger.log(`Iniciando download de PDF: ${url}`);

        try {
            // Validar URL
            this.validateUrl(url);

            // Baixar PDF
            const pdfBuffer = await this.downloadPdf(url, opts);

            // Validar tamanho
            if (pdfBuffer.length > opts.maxSize!) {
                throw new BadRequestException(
                    `PDF muito grande: ${pdfBuffer.length} bytes (máximo: ${opts.maxSize} bytes)`
                );
            }

            // Converter para base64
            const base64Content = pdfBuffer.toString('base64');

            this.logger.log(`PDF baixado com sucesso: ${pdfBuffer.length} bytes`);

            return {
                success: true,
                content: base64Content,
                size: pdfBuffer.length,
                url
            };

        } catch (error) {
            this.logger.error(`Erro ao baixar PDF: ${error.message}`);
            return {
                success: false,
                error: error.message,
                url
            };
        }
    }

    /**
     * Baixa múltiplos PDFs em paralelo
     */
    async downloadMultiplePdfs(
        urls: string[],
        options: PdfProcessingOptions = {}
    ): Promise<PdfDownloadResult[]> {
        this.logger.log(`Baixando ${urls.length} PDFs em paralelo`);

        const promises = urls.map(url => this.downloadAndProcessPdf(url, options));
        const results = await Promise.allSettled(promises);

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    success: false,
                    error: result.reason?.message || 'Erro desconhecido',
                    url: urls[index]
                };
            }
        });
    }

    /**
     * Valida se a URL é válida e acessível
     */
    private validateUrl(url: string): void {
        try {
            const urlObj = new URL(url);

            // Verificar protocolo
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new BadRequestException('URL deve usar protocolo HTTP ou HTTPS');
            }

            // Verificar se é PDF
            const pathname = urlObj.pathname.toLowerCase();
            if (!pathname.endsWith('.pdf')) {
                this.logger.warn(`URL não termina com .pdf: ${url}`);
            }

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`URL inválida: ${url}`);
        }
    }

    /**
     * Baixa o PDF da URL
     */
    private async downloadPdf(url: string, options: PdfProcessingOptions): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;

            const request = client.get(url, {
                timeout: options.timeout,
                headers: {
                    'User-Agent': 'AI-Service-PDF-Downloader/1.0',
                    'Accept': 'application/pdf, */*'
                }
            }, (response) => {
                // Verificar status code
                if (response.statusCode! >= 400) {
                    reject(new ServiceUnavailableException(
                        `Erro HTTP ${response.statusCode}: ${response.statusMessage}`
                    ));
                    return;
                }

                // Verificar content-type
                const contentType = response.headers['content-type'];
                if (contentType && !contentType.includes('application/pdf')) {
                    this.logger.warn(`Content-Type não é PDF: ${contentType}`);
                }

                // Verificar content-length
                const contentLength = response.headers['content-length'];
                if (contentLength && parseInt(contentLength) > options.maxSize!) {
                    reject(new BadRequestException(
                        `PDF muito grande: ${contentLength} bytes (máximo: ${options.maxSize} bytes)`
                    ));
                    return;
                }

                const chunks: Buffer[] = [];
                let totalSize = 0;

                response.on('data', (chunk: Buffer) => {
                    totalSize += chunk.length;

                    // Verificar tamanho durante o download
                    if (totalSize > options.maxSize!) {
                        reject(new BadRequestException(
                            `PDF muito grande: ${totalSize} bytes (máximo: ${options.maxSize} bytes)`
                        ));
                        return;
                    }

                    chunks.push(chunk);
                });

                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });

                response.on('error', (error) => {
                    reject(new ServiceUnavailableException(`Erro no download: ${error.message}`));
                });
            });

            request.on('error', (error) => {
                reject(new ServiceUnavailableException(`Erro na requisição: ${error.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new ServiceUnavailableException(`Timeout no download: ${options.timeout}ms`));
            });
        });
    }

    /**
     * Extrai texto de um PDF (implementação básica)
     * Nota: Para extração real de texto, seria necessário usar uma biblioteca como pdf-parse
     */
    async extractTextFromPdf(base64Content: string): Promise<string> {
        try {
            // Por enquanto, retorna uma mensagem indicando que o PDF foi recebido
            // Em uma implementação real, você usaria pdf-parse ou similar
            const buffer = Buffer.from(base64Content, 'base64');

            this.logger.log(`Extraindo texto de PDF: ${buffer.length} bytes`);

            // TODO: Implementar extração real de texto com pdf-parse
            // const pdfParse = require('pdf-parse');
            // const data = await pdfParse(buffer);
            // return data.text;

            return `[PDF recebido - ${buffer.length} bytes - Extração de texto não implementada]`;

        } catch (error) {
            this.logger.error(`Erro ao extrair texto do PDF: ${error.message}`);
            throw new ServiceUnavailableException(`Erro na extração de texto: ${error.message}`);
        }
    }

    /**
     * Processa uma lista de URLs de PDFs e retorna o conteúdo
     */
    async processPdfUrls(urls: string[]): Promise<{
        success: boolean;
        results: PdfDownloadResult[];
        totalSize: number;
        successCount: number;
        errorCount: number;
    }> {
        this.logger.log(`Processando ${urls.length} URLs de PDF`);

        const results = await this.downloadMultiplePdfs(urls);

        const totalSize = results
            .filter(r => r.success)
            .reduce((sum, r) => sum + (r.size || 0), 0);

        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;

        this.logger.log(`Processamento concluído: ${successCount} sucessos, ${errorCount} erros, ${totalSize} bytes total`);

        return {
            success: successCount > 0,
            results,
            totalSize,
            successCount,
            errorCount
        };
    }
}
