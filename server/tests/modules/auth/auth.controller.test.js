jest.mock('../../../src/modules/auth/auth.service');

const authService = require('../../../src/modules/auth/auth.service');
const { login, me, logout } = require('../../../src/modules/auth/auth.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

beforeEach(() => {
  next.mockClear();
  jest.clearAllMocks();
});

describe('login', () => {
  test('retorna 200 con el resultado del servicio', async () => {
    const result = { token: 'jwt-token', user: { id: 1, email: 'a@nur.edu.bo' } };
    authService.login.mockResolvedValue(result);
    const req = { body: { email: 'a@nur.edu.bo', password: 'pass' } };
    const res = makeRes();

    await login(req, res, next);

    expect(authService.login).toHaveBeenCalledWith({ email: 'a@nur.edu.bo', password: 'pass' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 si las credenciales son incorrectas', async () => {
    authService.login.mockRejectedValue(new Error('Usuario o contraseña incorrectos'));
    const req = { body: { email: 'a@nur.edu.bo', password: 'wrong' } };
    const res = makeRes();

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario o contraseña incorrectos' });
    expect(next).not.toHaveBeenCalled();
  });

  test('delega errores inesperados a next', async () => {
    const error = new Error('Error de BD');
    authService.login.mockRejectedValue(error);
    const req = { body: { email: 'a@nur.edu.bo', password: 'pass' } };
    const res = makeRes();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('me', () => {
  test('retorna 200 con el usuario autenticado', () => {
    const user = { id: 1, email: 'a@nur.edu.bo', role: 'admin' };
    const req = { user };
    const res = makeRes();

    me(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user });
  });
});

describe('logout', () => {
  test('retorna 200 con mensaje de sesión cerrada', () => {
    const res = makeRes();

    logout({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Sesion cerrada correctamente' });
  });
});
