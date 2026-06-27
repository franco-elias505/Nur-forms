jest.mock('../../../src/modules/campaigns/campaigns.service');

const campaignsService = require('../../../src/modules/campaigns/campaigns.service');
const {
  getAll, getById, create, update, remove,
  duplicateController, addMemberController, removeMemberController
} = require('../../../src/modules/campaigns/campaigns.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

const user = { id: 'user-1', email: 'a@nur.edu.bo', role: 'creator' };

beforeEach(() => {
  next.mockClear();
  jest.clearAllMocks();
});

describe('getAll', () => {
  test('retorna 200 con campañas', async () => {
    campaignsService.getAllService.mockResolvedValue([{ id: 'c1' }]);
    const res = makeRes();
    await getAll({ user }, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ campaigns: [{ id: 'c1' }] });
  });

  test('delega errores a next', async () => {
    const error = new Error('Error');
    campaignsService.getAllService.mockRejectedValue(error);
    const res = makeRes();
    await getAll({ user }, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('getById', () => {
  test('retorna 200 con detalle', async () => {
    campaignsService.getByIdService.mockResolvedValue({ id: 'c1' });
    const res = makeRes();
    await getById({ params: { id: 'c1' }, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 403 sin acceso', async () => {
    campaignsService.getByIdService.mockRejectedValue(new Error('No tiene acceso a esta campaña'));
    const res = makeRes();
    await getById({ params: { id: 'c1' }, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('retorna 400 si no existe', async () => {
    campaignsService.getByIdService.mockRejectedValue(new Error('Campaña inexistente'));
    const res = makeRes();
    await getById({ params: { id: 'bad' }, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('delega errores inesperados a next', async () => {
    const error = new Error('Error interno');
    campaignsService.getByIdService.mockRejectedValue(error);
    const res = makeRes();
    await getById({ params: { id: 'c1' }, user }, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('create', () => {
  test('retorna 201 al crear', async () => {
    campaignsService.createService.mockResolvedValue({ message: 'Campaña creada exitosamente' });
    const res = makeRes();
    await create({ body: { name: 'Nueva' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('retorna 400 si falla validación', async () => {
    campaignsService.createService.mockRejectedValue(new Error('Nombre obligatorio'));
    const res = makeRes();
    await create({ body: { name: '' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('update', () => {
  test('retorna 200 al actualizar', async () => {
    campaignsService.updateService.mockResolvedValue({ message: 'ok' });
    const res = makeRes();
    await update({ params: { id: 'c1' }, body: {}, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 500 si falla actualización de estado', async () => {
    campaignsService.updateService.mockRejectedValue(new Error('No se pudo actualizar el estado, intente nuevamente'));
    const res = makeRes();
    await update({ params: { id: 'c1' }, body: {}, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('retorna 400 para otros errores', async () => {
    campaignsService.updateService.mockRejectedValue(new Error('Transición inválida'));
    const res = makeRes();
    await update({ params: { id: 'c1' }, body: {}, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('remove', () => {
  test('retorna 204 al eliminar', async () => {
    campaignsService.removeService.mockResolvedValue(undefined);
    const res = makeRes();
    await remove({ params: { id: 'c1' }, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test('delega error interno a next', async () => {
    const error = new Error('Error al eliminar la campaña intente nuevamente');
    campaignsService.removeService.mockRejectedValue(error);
    const res = makeRes();
    await remove({ params: { id: 'c1' }, user }, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  test('retorna 400 para errores de negocio', async () => {
    campaignsService.removeService.mockRejectedValue(new Error('No tiene permisos'));
    const res = makeRes();
    await remove({ params: { id: 'c1' }, user }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('duplicateController', () => {
  test('retorna 201 al duplicar', async () => {
    campaignsService.duplicate.mockResolvedValue({ id: 'c2' });
    const res = makeRes();
    await duplicateController({ params: { id: 'c1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('retorna 400 si falla', async () => {
    campaignsService.duplicate.mockRejectedValue(new Error('No encontrada'));
    const res = makeRes();
    await duplicateController({ params: { id: 'bad' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('addMemberController', () => {
  test('retorna 201 al agregar miembro', async () => {
    campaignsService.addMember.mockResolvedValue({ id: 'm1' });
    const res = makeRes();
    await addMemberController({ params: { id: 'c1' }, body: { email: 'b@nur.edu.bo' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('retorna 400 si falla', async () => {
    campaignsService.addMember.mockRejectedValue(new Error('Usuario no encontrado'));
    const res = makeRes();
    await addMemberController({ params: { id: 'c1' }, body: {}, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('removeMemberController', () => {
  test('retorna 204 al quitar miembro', async () => {
    campaignsService.removeMember.mockResolvedValue(undefined);
    const res = makeRes();
    await removeMemberController({ params: { id: 'c1', memberId: 'm1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  test('retorna 400 si falla', async () => {
    campaignsService.removeMember.mockRejectedValue(new Error('No es miembro'));
    const res = makeRes();
    await removeMemberController({ params: { id: 'c1', memberId: 'm1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
