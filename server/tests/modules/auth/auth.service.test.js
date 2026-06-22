jest.mock('../../../src/repositories/user.repository.js');
jest.mock('bcryptjs');
jest.mock('../../../src/utils/jwt');

const userRepository = require('../../../src/repositories/user.repository.js');
const bcrypt = require('bcryptjs');
const { generateAccessToken } = require('../../../src/utils/jwt');
const { login } = require('../../../src/modules/auth/auth.service');

describe('login', () => {
  const mockUser = {
    id: 1,
    email: 'usuario@nur.edu.bo',
    full_name: 'Juan Pérez',
    role: 'creator',
    password_hash: 'hashed-password',
    is_active: true
  };

  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserByEmail.mockResolvedValue(null);

    await expect(login({ email: 'noexiste@nur.edu.bo', password: '1234' }))
      .rejects.toThrow('Usuario o contraseña incorrectos');
  });

  test('lanza error si el usuario está inactivo', async () => {
    userRepository.getUserByEmail.mockResolvedValue({ ...mockUser, is_active: false });

    await expect(login({ email: 'usuario@nur.edu.bo', password: '1234' }))
      .rejects.toThrow('Usuario o contraseña incorrectos');
  });

  test('lanza error si la contraseña no coincide', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(login({ email: 'usuario@nur.edu.bo', password: 'wrong-pass' }))
      .rejects.toThrow('Usuario o contraseña incorrectos');
  });

  test('retorna token y datos de usuario en login exitoso', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    generateAccessToken.mockReturnValue('jwt-token-generado');

    const result = await login({ email: 'usuario@nur.edu.bo', password: 'correcta' });

    expect(generateAccessToken).toHaveBeenCalledWith({
      id: 1,
      email: 'usuario@nur.edu.bo',
      role: 'creator'
    });
    expect(result).toEqual({
      token: 'jwt-token-generado',
      user: {
        id: 1,
        email: 'usuario@nur.edu.bo',
        full_name: 'Juan Pérez',
        role: 'creator'
      }
    });
  });

  test('llama a getUserByEmail con el email correcto', async () => {
    userRepository.getUserByEmail.mockResolvedValue(null);

    try {
      await login({ email: 'test@nur.edu.bo', password: '1234' });
    } catch {}

    expect(userRepository.getUserByEmail).toHaveBeenCalledWith('test@nur.edu.bo');
  });

  test('llama a bcrypt.compare con la contraseña y el hash correcto', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    generateAccessToken.mockReturnValue('token');

    await login({ email: 'usuario@nur.edu.bo', password: 'mi-pass' });

    expect(bcrypt.compare).toHaveBeenCalledWith('mi-pass', 'hashed-password');
  });
});
