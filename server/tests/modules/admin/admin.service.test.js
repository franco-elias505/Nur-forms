jest.mock('../../../src/repositories/user.repository.js');
jest.mock('../../../src/utils/validateInputsValue.js');
jest.mock('bcryptjs');

const userRepository = require('../../../src/repositories/user.repository.js');
const inputValidator = require('../../../src/utils/validateInputsValue.js');
const bcrypt = require('bcryptjs');
const { getAll, getById, updateRole, toggleActive, processNewUser, deleteUserService } = require('../../../src/modules/admin/admin.service');

const mockUser = {
  id: 1,
  email: 'user@nur.edu.bo',
  full_name: 'Ana López',
  role: 'creator',
  is_active: true
};

// Helpers de validación exitosa
const okResult = { success: true };
const failResult = (msg) => ({ success: false, error: msg });

describe('getAll', () => {
  test('retorna lista de usuarios', async () => {
    userRepository.getAllUsers.mockResolvedValue([mockUser]);
    const result = await getAll();
    expect(result).toEqual([mockUser]);
    expect(userRepository.getAllUsers).toHaveBeenCalledTimes(1);
  });

  test('retorna array vacío si no hay usuarios', async () => {
    userRepository.getAllUsers.mockResolvedValue([]);
    const result = await getAll();
    expect(result).toEqual([]);
  });
});

describe('getById', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(getById(99)).rejects.toThrow('Usuario no encontrado');
  });

  test('retorna el usuario si existe', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    const result = await getById(1);
    expect(result).toEqual(mockUser);
    expect(userRepository.getUserById).toHaveBeenCalledWith(1);
  });
});

describe('updateRole', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(updateRole(99, 'admin')).rejects.toThrow('Usuario no encontrado');
  });

  test('lanza error si el rol es inválido', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    await expect(updateRole(1, 'superadmin')).rejects.toThrow('Rol invalido');
  });

  test('lanza error si la actualización falla', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(null);
    await expect(updateRole(1, 'admin')).rejects.toThrow('No se pudo actualizar al usuario');
  });

  test('retorna el usuario actualizado con el nuevo rol', async () => {
    const updated = { ...mockUser, role: 'admin' };
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(updated);

    const result = await updateRole(1, 'admin');

    expect(userRepository.updateUserById).toHaveBeenCalledWith(1, { role: 'admin' });
    expect(result).toEqual({
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      role: 'admin'
    });
  });
});

describe('toggleActive', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(toggleActive(99)).rejects.toThrow('Usuario no encontrado');
  });

  test('lanza error si la actualización falla', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(null);
    await expect(toggleActive(1)).rejects.toThrow(/No se pudo actualizar/);
  });

  test('desactiva un usuario activo', async () => {
    const updated = { ...mockUser, is_active: false };
    userRepository.getUserById.mockResolvedValue({ ...mockUser, is_active: true });
    userRepository.updateUserById.mockResolvedValue(updated);

    const result = await toggleActive(1);
    expect(userRepository.updateUserById).toHaveBeenCalledWith(1, { is_active: false });
    expect(result.is_active).toBe(false);
  });

  test('activa un usuario inactivo', async () => {
    const inactiveUser = { ...mockUser, is_active: false };
    const updated = { ...mockUser, is_active: true };
    userRepository.getUserById.mockResolvedValue(inactiveUser);
    userRepository.updateUserById.mockResolvedValue(updated);

    const result = await toggleActive(1);
    expect(userRepository.updateUserById).toHaveBeenCalledWith(1, { is_active: true });
    expect(result.is_active).toBe(true);
  });
});

describe('processNewUser', () => {
  const newUserData = {
    email: 'nuevo@nur.edu.bo',
    full_name: 'Nuevo Usuario',
    password: 'pass123',
    role: 'respondent'
  };

  test('lanza error si el email es inválido', async () => {
    inputValidator.validateEmail.mockReturnValue(failResult('Formato de email invalido'));

    await expect(processNewUser(newUserData)).rejects.toThrow('Formato de email invalido');
  });

  test('lanza error si el nombre es inválido', async () => {
    inputValidator.validateEmail.mockReturnValue(okResult);
    inputValidator.validateInput.mockReturnValueOnce(failResult('No puede dejar este campo vacio'));

    await expect(processNewUser(newUserData)).rejects.toThrow('No puede dejar este campo vacio');
  });

  test('lanza error si la contraseña es inválida', async () => {
    inputValidator.validateEmail.mockReturnValue(okResult);
    inputValidator.validateInput.mockReturnValueOnce(okResult); // nombre ok
    inputValidator.validateInput.mockReturnValueOnce(failResult('No puede dejar este campo vacio')); // password falla

    await expect(processNewUser(newUserData)).rejects.toThrow('No puede dejar este campo vacio');
  });

  test('lanza error si el rol es inválido', async () => {
    inputValidator.validateEmail.mockReturnValue(okResult);
    inputValidator.validateInput.mockReturnValue(okResult);
    inputValidator.validateRole.mockReturnValue(failResult('Rol inválido'));

    await expect(processNewUser(newUserData)).rejects.toThrow('Rol inválido');
  });

  test('lanza error si el email ya está en uso', async () => {
    inputValidator.validateEmail.mockReturnValue(okResult);
    inputValidator.validateInput.mockReturnValue(okResult);
    inputValidator.validateRole.mockReturnValue(okResult);
    userRepository.getUserByEmail.mockResolvedValue(mockUser);

    await expect(processNewUser(newUserData)).rejects.toThrow(/ya esta siendo ocupada/);
  });

  test('lanza error si createUser falla', async () => {
    inputValidator.validateEmail.mockReturnValue(okResult);
    inputValidator.validateInput.mockReturnValue(okResult);
    inputValidator.validateRole.mockReturnValue(okResult);
    userRepository.getUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-pass');
    userRepository.createUser.mockResolvedValue(null);

    await expect(processNewUser(newUserData)).rejects.toThrow('Error al crear el usuario, intente nuevamente');
  });

  test('crea el usuario exitosamente con la contraseña hasheada', async () => {
    inputValidator.validateEmail.mockReturnValue(okResult);
    inputValidator.validateInput.mockReturnValue(okResult);
    inputValidator.validateRole.mockReturnValue(okResult);
    userRepository.getUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-pass');
    userRepository.createUser.mockResolvedValue({ id: 2, ...newUserData, password_hash: 'hashed-pass' });

    const result = await processNewUser(newUserData);

    expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10);
    expect(userRepository.createUser).toHaveBeenCalledWith({
      email: newUserData.email,
      password_hash: 'hashed-pass',
      full_name: newUserData.full_name,
      role: newUserData.role
    });
    expect(result.email).toBe(newUserData.email);
  });
});

describe('deleteUserService', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(deleteUserService(99)).rejects.toThrow('El usuario no existe');
  });

  test('lanza error si el usuario tiene campañas activas', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.countUserCampaigns.mockResolvedValue(2);

    await expect(deleteUserService(1)).rejects.toThrow(/campañas pendientes/);
  });

  test('lanza error si el usuario tiene submissions activos', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.countUserCampaigns.mockResolvedValue(0);
    userRepository.countUserSubmissions.mockResolvedValue(1);

    await expect(deleteUserService(1)).rejects.toThrow(/respondiente de una campaña activa/);
  });

  test('elimina el usuario si no tiene dependencias', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.countUserCampaigns.mockResolvedValue(0);
    userRepository.countUserSubmissions.mockResolvedValue(0);
    userRepository.deleteUser.mockResolvedValue(1);

    await expect(deleteUserService(1)).resolves.toBeUndefined();
    expect(userRepository.deleteUser).toHaveBeenCalledWith(1);
  });
});
