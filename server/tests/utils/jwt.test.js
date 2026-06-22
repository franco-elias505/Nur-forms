jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../../src/utils/jwt');

const MOCK_SECRET = 'test-secret';

beforeEach(() => {
  process.env.JWT_SECRET = MOCK_SECRET;
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
});

describe('generateAccessToken', () => {
  test('llama a jwt.sign con el payload correcto', () => {
    jwt.sign.mockReturnValue('access-token-mock');

    const user = { id: 1, email: 'user@nur.edu.bo', role: 'creator' };
    const token = generateAccessToken(user);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 1, email: 'user@nur.edu.bo', role: 'creator' },
      MOCK_SECRET,
      { expiresIn: '1h' }
    );
    expect(token).toBe('access-token-mock');
  });

  test('usa expiresIn por defecto si JWT_EXPIRES_IN no está definido', () => {
    delete process.env.JWT_EXPIRES_IN;
    jwt.sign.mockReturnValue('token');

    generateAccessToken({ id: 1, email: 'a@nur.edu.bo', role: 'admin' });

    const callArgs = jwt.sign.mock.calls[0];
    expect(callArgs[2].expiresIn).toBe('1h');
  });
});

describe('generateRefreshToken', () => {
  test('llama a jwt.sign solo con id en el payload', () => {
    jwt.sign.mockReturnValue('refresh-token-mock');

    const user = { id: 5, email: 'user@nur.edu.bo', role: 'respondent' };
    const token = generateRefreshToken(user);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 5 },
      MOCK_SECRET,
      { expiresIn: '7d' }
    );
    expect(token).toBe('refresh-token-mock');
  });

  test('usa 7d como refresh expiry por defecto', () => {
    delete process.env.JWT_REFRESH_EXPIRES_IN;
    jwt.sign.mockReturnValue('token');

    generateRefreshToken({ id: 2 });

    const callArgs = jwt.sign.mock.calls[0];
    expect(callArgs[2].expiresIn).toBe('7d');
  });
});

describe('verifyToken', () => {
  test('retorna el payload decodificado si el token es válido', () => {
    const mockPayload = { id: 1, email: 'a@nur.edu.bo', role: 'admin' };
    jwt.verify.mockReturnValue(mockPayload);

    const result = verifyToken('valid-token');

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', MOCK_SECRET);
    expect(result).toEqual(mockPayload);
  });

  test('lanza error si el token es inválido', () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    expect(() => verifyToken('bad-token')).toThrow('invalid token');
  });

  test('lanza error si el token está expirado', () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

    expect(() => verifyToken('expired-token')).toThrow('jwt expired');
  });
});
