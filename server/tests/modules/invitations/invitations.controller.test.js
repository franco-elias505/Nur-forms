jest.mock('../../../src/modules/invitations/invitations.service');

const invitationsService = require('../../../src/modules/invitations/invitations.service');
const { getByForm, create, remove, validate } = require('../../../src/modules/invitations/invitations.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const user = { id: 'user-1', role: 'creator' };

beforeEach(() => jest.clearAllMocks());

describe('getByForm', () => {
  test('retorna 200 con invitaciones', async () => {
    invitationsService.getByForm.mockResolvedValue([{ id: 'inv-1' }]);
    const res = makeRes();
    await getByForm({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    invitationsService.getByForm.mockRejectedValue(new Error('Error'));
    const res = makeRes();
    await getByForm({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('create', () => {
  test('retorna 201 al crear invitaciones', async () => {
    invitationsService.create.mockResolvedValue([{ email: 'a@nur.edu.bo' }]);
    const req = {
      params: { formId: 'form-1' },
      body: { emails: ['a@nur.edu.bo'] },
      user,
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000')
    };
    const res = makeRes();
    await create(req, res);
    expect(invitationsService.create).toHaveBeenCalledWith(
      'form-1', ['a@nur.edu.bo'], 'user-1', 'creator', 'http://localhost:3000'
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('retorna 400 si falla', async () => {
    invitationsService.create.mockRejectedValue(new Error('Email inválido'));
    const req = {
      params: { formId: 'form-1' },
      body: { emails: [] },
      user,
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost')
    };
    const res = makeRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('remove', () => {
  test('retorna 204 al eliminar', async () => {
    invitationsService.remove.mockResolvedValue(undefined);
    const res = makeRes();
    await remove({ params: { id: 'inv-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test('retorna 400 si falla', async () => {
    invitationsService.remove.mockRejectedValue(new Error('No encontrada'));
    const res = makeRes();
    await remove({ params: { id: 'inv-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validate', () => {
  test('retorna 200 si el token es válido', async () => {
    invitationsService.validate.mockResolvedValue({ valid: true });
    const res = makeRes();
    await validate({ params: { formId: 'form-1' }, query: { token: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si el token es inválido', async () => {
    invitationsService.validate.mockRejectedValue(new Error('Token inválido'));
    const res = makeRes();
    await validate({ params: { formId: 'form-1' }, query: { token: 'bad' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
