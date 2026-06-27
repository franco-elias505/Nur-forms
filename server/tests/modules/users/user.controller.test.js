jest.mock('../../../src/modules/users/user.service.js');

const userService = require('../../../src/modules/users/user.service.js');
const { getAll, getById, search, updateRole, toggleActive } = require('../../../src/modules/users/user.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockUser = { id: 1, email: 'user@nur.edu.bo', full_name: 'Ana', role: 'creator', is_active: true };

beforeEach(() => jest.clearAllMocks());

describe('getAll', () => {
  test('retorna 200 con usuarios', async () => {
    userService.getAllUsers.mockResolvedValue([mockUser]);
    const res = makeRes();
    await getAll({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([mockUser]);
  });

  test('retorna 500 si falla', async () => {
    userService.getAllUsers.mockRejectedValue(new Error('Error'));
    const res = makeRes();
    await getAll({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getById', () => {
  test('retorna 200 con el usuario', async () => {
    userService.getUserById.mockResolvedValue(mockUser);
    const res = makeRes();
    await getById({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  test('retorna 404 si no existe', async () => {
    userService.getUserById.mockRejectedValue(new Error('No encontrado'));
    const res = makeRes();
    await getById({ params: { id: '99' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('search', () => {
  test('retorna 200 con resultados', async () => {
    userService.searchUsers.mockResolvedValue([mockUser]);
    const res = makeRes();
    await search({ query: { email: 'user' } }, res);
    expect(userService.searchUsers).toHaveBeenCalledWith('user');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    userService.searchUsers.mockRejectedValue(new Error('Email requerido'));
    const res = makeRes();
    await search({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateRole', () => {
  test('retorna 200 al actualizar rol', async () => {
    userService.updateUserRole.mockResolvedValue({ ...mockUser, role: 'admin' });
    const res = makeRes();
    await updateRole({ params: { id: '1' }, body: { role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    userService.updateUserRole.mockRejectedValue(new Error('Rol invalido'));
    const res = makeRes();
    await updateRole({ params: { id: '1' }, body: { role: 'bad' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('toggleActive', () => {
  test('retorna 200 al cambiar estado', async () => {
    userService.toggleUserActive.mockResolvedValue({ ...mockUser, is_active: false });
    const res = makeRes();
    await toggleActive({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    userService.toggleUserActive.mockRejectedValue(new Error('No encontrado'));
    const res = makeRes();
    await toggleActive({ params: { id: '99' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
