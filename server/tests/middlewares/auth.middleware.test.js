jest.mock('../../src/utils/jwt');
const { verifyToken } = require('../../src/utils/jwt');
const { authenticate, authorize } = require('../../src/middlewares/auth.middleware');

const makeReq = (authHeader) => ({ headers: { authorization: authHeader } });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

beforeEach(() => {
  next.mockClear();
});

describe('authenticate', () => {
  test('responde 401 si no hay header Authorization', () => {
    const req = makeReq(undefined);
    const res = makeRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token requerido' });
    expect(next).not.toHaveBeenCalled();
  });

  test('responde 401 si el token está vacío', () => {
    const req = makeReq('Bearer ');
    const res = makeRes();

    // "Bearer " split por espacio da ['Bearer', ''] -> '' es falsy
    verifyToken.mockReturnValue({ id: 1, role: 'admin' });
    authenticate(req, res, next);

    // El token vacío ('') es falsy, así que responde 401
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('responde 401 si el token es inválido o expirado', () => {
    const req = makeReq('Bearer token-invalido');
    const res = makeRes();
    verifyToken.mockImplementation(() => { throw new Error('jwt expired'); });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  test('llama a next() y asigna req.user si el token es válido', () => {
    const payload = { id: 42, email: 'admin@nur.edu.bo', role: 'admin' };
    verifyToken.mockReturnValue(payload);

    const req = makeReq('Bearer valid-token');
    const res = makeRes();

    authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('authorize', () => {
  test('responde 403 si el rol del usuario no está en la lista permitida', () => {
    const req = { user: { role: 'respondent' } };
    const res = makeRes();
    const middleware = authorize('admin', 'creator');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No tiene permisos para esto.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('llama a next() si el rol es correcto', () => {
    const req = { user: { role: 'admin' } };
    const res = makeRes();
    const middleware = authorize('admin', 'creator');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('permite múltiples roles válidos', () => {
    const middleware = authorize('admin', 'creator');

    const reqCreator = { user: { role: 'creator' } };
    const res1 = makeRes();
    middleware(reqCreator, res1, next);
    expect(next).toHaveBeenCalledTimes(1);

    next.mockClear();

    const reqAdmin = { user: { role: 'admin' } };
    const res2 = makeRes();
    middleware(reqAdmin, res2, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
