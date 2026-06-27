jest.mock('../../../src/modules/admin/admin.service');

const adminService = require('../../../src/modules/admin/admin.service');
const {
  getAll,
  getById,
  updateRole,
  toggleActive,
  registerUser,
  deleteUser
} = require('../../../src/modules/admin/admin.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

const mockUser = {
  id: 1,
  email: 'user@nur.edu.bo',
  full_name: 'Ana López',
  role: 'creator',
  is_active: true
};

beforeEach(() => {
  next.mockClear();
  jest.clearAllMocks();
});

describe('getAll', () => {
  test('retorna 200 con la lista de usuarios', async () => {
    adminService.getAll.mockResolvedValue([mockUser]);
    const res = makeRes();

    await getAll({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([mockUser]);
  });

  test('retorna 500 si el servicio falla', async () => {
    adminService.getAll.mockRejectedValue(new Error('Error de BD'));
    const res = makeRes();

    await getAll({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error de BD' });
  });
});

describe('getById', () => {
  test('retorna 200 con el usuario', async () => {
    adminService.getById.mockResolvedValue(mockUser);
    const req = { params: { id: '1' } };
    const res = makeRes();

    await getById(req, res);

    expect(adminService.getById).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  test('retorna 404 si el usuario no existe', async () => {
    adminService.getById.mockRejectedValue(new Error('Usuario no encontrado'));
    const req = { params: { id: '99' } };
    const res = makeRes();

    await getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
  });
});

describe('updateRole', () => {
  test('retorna 200 con el usuario actualizado', async () => {
    const updated = { ...mockUser, role: 'admin' };
    adminService.updateRole.mockResolvedValue(updated);
    const req = { params: { id: '1' }, body: { role: 'admin' } };
    const res = makeRes();

    await updateRole(req, res);

    expect(adminService.updateRole).toHaveBeenCalledWith('1', 'admin');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test('retorna 400 si el rol es inválido', async () => {
    adminService.updateRole.mockRejectedValue(new Error('Rol invalido'));
    const req = { params: { id: '1' }, body: { role: 'bad' } };
    const res = makeRes();

    await updateRole(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Rol invalido' });
  });
});

describe('toggleActive', () => {
  test('retorna 200 con el usuario actualizado', async () => {
    const updated = { ...mockUser, is_active: false };
    adminService.toggleActive.mockResolvedValue(updated);
    const req = { params: { id: '1' } };
    const res = makeRes();

    await toggleActive(req, res);

    expect(adminService.toggleActive).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test('retorna 400 si falla la actualización', async () => {
    adminService.toggleActive.mockRejectedValue(new Error('Usuario no encontrado'));
    const req = { params: { id: '99' } };
    const res = makeRes();

    await toggleActive(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
  });
});

describe('registerUser', () => {
  const body = {
    email: 'nuevo@nur.edu.bo',
    password: 'pass123',
    full_name: 'Nuevo Usuario',
    role: 'respondent'
  };

  test('retorna 201 con el usuario creado', async () => {
    adminService.processNewUser.mockResolvedValue({ id: 2, ...body });
    const req = { body };
    const res = makeRes();

    await registerUser(req, res, next);

    expect(adminService.processNewUser).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usuario creado exitosamente',
      user: { id: 2, email: body.email, full_name: body.full_name, role: body.role }
    });
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    'No puede dejar este campo vacio',
    'Formato de email invalido',
    'Rol inválido'
  ])('retorna 400 para error de validación: %s', async (message) => {
    adminService.processNewUser.mockRejectedValue(new Error(message));
    const req = { body };
    const res = makeRes();

    await registerUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message });
    expect(next).not.toHaveBeenCalled();
  });

  test('delega errores inesperados a next', async () => {
    const error = new Error('Error interno');
    adminService.processNewUser.mockRejectedValue(error);
    const req = { body };
    const res = makeRes();

    await registerUser(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('deleteUser', () => {
  test('retorna 200 al eliminar correctamente', async () => {
    adminService.deleteUserService.mockResolvedValue(undefined);
    const req = { params: { id: '1' } };
    const res = makeRes();

    await deleteUser(req, res, next);

    expect(adminService.deleteUserService).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario eliminado correctamente' });
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    'El usuario tiene campañas pendientes, debe terminar el ciclo de esta para poder ejecutar la accion',
    'Este usuario es respondiente de una campaña activa, debe terminar el ciclo de esta para poder ejecutar la accion',
    'El usuario no existe'
  ])('retorna 400 para error de negocio: %s', async (message) => {
    adminService.deleteUserService.mockRejectedValue(new Error(message));
    const req = { params: { id: '1' } };
    const res = makeRes();

    await deleteUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message });
    expect(next).not.toHaveBeenCalled();
  });

  test('delega errores inesperados a next', async () => {
    const error = new Error('Error de BD');
    adminService.deleteUserService.mockRejectedValue(error);
    const req = { params: { id: '1' } };
    const res = makeRes();

    await deleteUser(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
