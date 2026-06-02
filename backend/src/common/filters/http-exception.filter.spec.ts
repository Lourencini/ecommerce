import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const makeContext = (method = 'GET', url = '/test') => {
  const json = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();

  return {
    ctx: {
      switchToHttp: () => ({
        getRequest:  () => ({ method, url }),
        getResponse: () => ({ status: statusFn, json, setHeader }),
      }),
    } as any,
    statusFn,
    json,
  };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => { filter = new HttpExceptionFilter(); });

  it('responde com status HTTP correto e formato RFC 7807', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const { ctx, statusFn, json } = makeContext();

    filter.catch(exception, ctx);
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: HttpStatus.NOT_FOUND, title: 'Not Found' }),
    );
  });

  it('extrai erros de validação do array de mensagens', () => {
    const exception = new HttpException(
      { message: ['name must not be empty', 'email must be valid'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    const { ctx, json } = makeContext('POST', '/api/v1/products');

    filter.catch(exception, ctx);
    const payload = json.mock.calls[0][0];
    expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
    expect(payload.errors).toEqual(['name must not be empty', 'email must be valid']);
  });

  it('inclui instance com a URL da requisição', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    const { ctx, json } = makeContext('DELETE', '/api/v1/users/1');

    filter.catch(exception, ctx);
    expect(json.mock.calls[0][0].instance).toBe('/api/v1/users/1');
  });

  it('retorna 500 para erros não-HTTP inesperados', () => {
    const { ctx, statusFn } = makeContext();
    filter.catch(new Error('unexpected'), ctx);
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
