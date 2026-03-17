import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Implementa RFC 7807 — Problem Details for HTTP APIs
 * https://www.rfc-editor.org/rfc/rfc7807
 *
 * Em vez de retornar { statusCode, message }, retorna:
 * {
 *   type: "https://ecommerce3d.com/errors/validation-error",
 *   title: "Validation Error",
 *   status: 422,
 *   detail: "description goes here",
 *   instance: "/api/v1/shipping/quote",
 *   errors: [...] (opcional)
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let title = 'Internal Server Error';
        let detail = 'Um erro inesperado ocorreu. Tente novamente mais tarde.';
        let errors: unknown[] | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            title = this.getTitleFromStatus(status);

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const res = exceptionResponse as Record<string, unknown>;

                // class-validator retorna { message: string[] } para validation errors
                if (Array.isArray(res['message'])) {
                    detail = 'A requisição contém dados inválidos.';
                    errors = res['message'];
                } else {
                    detail = (res['message'] as string) || detail;
                }
            } else {
                detail = String(exceptionResponse);
            }
        } else if (exception instanceof Error) {
            this.logger.error(
                `Erro não tratado: ${exception.message}`,
                exception.stack,
            );
        }

        // RFC 7807: Content-Type deve ser application/problem+json
        response.setHeader('Content-Type', 'application/problem+json');

        const problemDetail = {
            type: `https://ecommerce3d.com/errors/${this.getTypeSlug(title)}`,
            title,
            status,
            detail,
            instance: request.url,
            ...(errors && { errors }),
            timestamp: new Date().toISOString(),
        };

        response.status(status).json(problemDetail);
    }

    private getTitleFromStatus(status: number): string {
        const titles: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        };
        return titles[status] || 'Error';
    }

    private getTypeSlug(title: string): string {
        return title.toLowerCase().replace(/\s+/g, '-');
    }
}
