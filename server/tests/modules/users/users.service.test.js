jest.mock('../../../src/repositories/user.repository.js');

const userRepository = require('../../../src/repositories/user.repository.js');
const { getAllUsers, getUserById, searchUsers, updateUserRole, toggleUserActive } = require('../../../src/modules/users/user.service');

const mockUser = {
  id: 10,
  email: 'maria@nur.edu.bo',
  full_name: 'María García',
  role: 'respondent',
  is_active: true
};

describe('getAllUsers', () => {
  test('retorna todos los usuarios', async () => {
    userRepository.getAllUsers.mockResolvedValue([mockUser]);
    const result = await getAllUsers();
    expect(result).toEqual([mockUser]);
  });

  test('retorna array vacío si no hay usuarios', async () => {
    userRepository.getAllUsers.mockResolvedValue([]);
    const result = await getAllUsers();
    expect(result).toEqual([]);
  });
});

describe('getUserById', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(getUserById(999)).rejects.toThrow('Usuario no encontrado');
  });

  test('retorna el usuario si existe', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    const result = await getUserById(10);
    expect(result).toEqual(mockUser);
    expect(userRepository.getUserById).toHaveBeenCalledWith(10);
  });
});

describe('searchUsers', () => {
  test('lanza error si la query está vacía', async () => {
    await expect(searchUsers('')).rejects.toThrow('Ingrese un email para buscar');
  });

  test('lanza error si la query es solo espacios', async () => {
    await expect(searchUsers('   ')).rejects.toThrow('Ingrese un email para buscar');
  });

  test('lanza error si la query es undefined', async () => {
    await expect(searchUsers(undefined)).rejects.toThrow('Ingrese un email para buscar');
  });

  test('busca por email y retorna el resultado', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser);
    const result = await searchUsers('maria@nur.edu.bo');
    expect(userRepository.getUserByEmail).toHaveBeenCalledWith('maria@nur.edu.bo');
    expect(result).toEqual(mockUser);
  });

  test('trim del email antes de buscar', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser);
    await searchUsers('  maria@nur.edu.bo  ');
    expect(userRepository.getUserByEmail).toHaveBeenCalledWith('maria@nur.edu.bo');
  });
});

describe('updateUserRole', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(updateUserRole(999, 'admin')).rejects.toThrow('Usuario no encontrado');
  });

  test('lanza error si el rol es inválido', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    await expect(updateUserRole(10, 'moderator')).rejects.toThrow('Rol invalido');
  });

  test('lanza error si la actualización falla', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(null);
    await expect(updateUserRole(10, 'creator')).rejects.toThrow('No se pudo actualizar el rol');
  });

  test('actualiza el rol exitosamente', async () => {
    const updated = { ...mockUser, role: 'creator' };
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(updated);

    const result = await updateUserRole(10, 'creator');

    expect(userRepository.updateUserById).toHaveBeenCalledWith(10, { role: 'creator' });
    expect(result).toEqual({ id: 10, email: mockUser.email, full_name: mockUser.full_name, role: 'creator' });
  });

  test.each(['admin', 'creator', 'respondent'])('acepta el rol válido: %s', async (role) => {
    const updated = { ...mockUser, role };
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(updated);
    const result = await updateUserRole(10, role);
    expect(result.role).toBe(role);
  });
});

describe('toggleUserActive', () => {
  test('lanza error si el usuario no existe', async () => {
    userRepository.getUserById.mockResolvedValue(null);
    await expect(toggleUserActive(999)).rejects.toThrow('Usuario no encontrado');
  });

  test('lanza error si la actualización falla', async () => {
    userRepository.getUserById.mockResolvedValue(mockUser);
    userRepository.updateUserById.mockResolvedValue(null);
    await expect(toggleUserActive(10)).rejects.toThrow('No se pudo cambiar el estado del usuario');
  });

  test('desactiva a un usuario activo', async () => {
    const updated = { ...mockUser, is_active: false };
    userRepository.getUserById.mockResolvedValue({ ...mockUser, is_active: true });
    userRepository.updateUserById.mockResolvedValue(updated);

    const result = await toggleUserActive(10);
    expect(userRepository.updateUserById).toHaveBeenCalledWith(10, { is_active: false });
    expect(result.is_active).toBe(false);
  });

  test('activa a un usuario inactivo', async () => {
    const inactiveUser = { ...mockUser, is_active: false };
    const updated = { ...mockUser, is_active: true };
    userRepository.getUserById.mockResolvedValue(inactiveUser);
    userRepository.updateUserById.mockResolvedValue(updated);

    const result = await toggleUserActive(10);
    expect(userRepository.updateUserById).toHaveBeenCalledWith(10, { is_active: true });
    expect(result.is_active).toBe(true);
  });
});
