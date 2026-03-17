import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import * as xss from 'xss';

/**
 * Pipe de sanitização XSS para strings.
 * Aplicado nos campos de texto livre (descrições de produtos).
 *
 * Usa a lib `xss` com configuração restritiva:
 * - Remove TODOS os atributos de evento (onload, onclick, etc.)
 * - Lista de allowlist de tags vazias — remove tudo por padrão
 */
@Injectable()
export class XssSanitizePipe implements PipeTransform {
    private readonly xssOptions: xss.IFilterXSSOptions = {
        // Sem tags permitidas — remove qualquer HTML
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style'],
    };

    transform(value: unknown): unknown {
        if (typeof value === 'string') {
            return xss.filterXSS(value, this.xssOptions);
        }

        if (typeof value === 'object' && value !== null) {
            return this.sanitizeObject(value as Record<string, unknown>);
        }

        return value;
    }

    private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
        const sanitized: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(obj)) {
            if (typeof val === 'string') {
                sanitized[key] = xss.filterXSS(val, this.xssOptions);
            } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                sanitized[key] = this.sanitizeObject(val as Record<string, unknown>);
            } else if (Array.isArray(val)) {
                sanitized[key] = val.map((item) =>
                    typeof item === 'string'
                        ? xss.filterXSS(item, this.xssOptions)
                        : item,
                );
            } else {
                sanitized[key] = val;
            }
        }

        return sanitized;
    }
}
