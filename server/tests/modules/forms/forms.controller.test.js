jest.mock('../../../src/modules/forms/forms.service');

const formsService = require('../../../src/modules/forms/forms.service');
const {
  getByCampaign, getById, getByToken, create, update,
  remove, duplicate, publish, close
} = require('../../../src/modules/forms/forms.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const user = { id: 'user-1', role: 'creator' };
const mockForm = { id: 'form-1', title: 'Test' };

beforeEach(() => jest.clearAllMocks());

const testHandler = (name, handler, { successStatus, errorStatus, setupSuccess, setupError, req }) => {
  describe(name, () => {
    test(`retorna ${successStatus} en éxito`, async () => {
      setupSuccess();
      const res = makeRes();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(successStatus);
    });

    test(`retorna ${errorStatus} si falla`, async () => {
      setupError();
      const res = makeRes();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(errorStatus);
    });
  });
};

testHandler('getByCampaign', getByCampaign, {
  successStatus: 200, errorStatus: 403,
  setupSuccess: () => formsService.getByCampaign.mockResolvedValue([mockForm]),
  setupError: () => formsService.getByCampaign.mockRejectedValue(new Error('Sin acceso')),
  req: { params: { campaignId: 'camp-1' }, user }
});

testHandler('getById', getById, {
  successStatus: 200, errorStatus: 404,
  setupSuccess: () => formsService.getById.mockResolvedValue(mockForm),
  setupError: () => formsService.getById.mockRejectedValue(new Error('No encontrado')),
  req: { params: { id: 'form-1' }, user }
});

testHandler('getByToken', getByToken, {
  successStatus: 200, errorStatus: 404,
  setupSuccess: () => formsService.getByToken.mockResolvedValue(mockForm),
  setupError: () => formsService.getByToken.mockRejectedValue(new Error('No encontrado')),
  req: { params: { id: 'token-abc' } }
});

testHandler('create', create, {
  successStatus: 201, errorStatus: 400,
  setupSuccess: () => formsService.create.mockResolvedValue(mockForm),
  setupError: () => formsService.create.mockRejectedValue(new Error('Datos inválidos')),
  req: { body: { title: 'Nuevo' }, user }
});

testHandler('update', update, {
  successStatus: 200, errorStatus: 400,
  setupSuccess: () => formsService.update.mockResolvedValue(mockForm),
  setupError: () => formsService.update.mockRejectedValue(new Error('Error')),
  req: { params: { id: 'form-1' }, body: {}, user }
});

testHandler('remove', remove, {
  successStatus: 204, errorStatus: 400,
  setupSuccess: () => formsService.remove.mockResolvedValue(undefined),
  setupError: () => formsService.remove.mockRejectedValue(new Error('Error')),
  req: { params: { id: 'form-1' }, user }
});

testHandler('duplicate', duplicate, {
  successStatus: 201, errorStatus: 400,
  setupSuccess: () => formsService.duplicate.mockResolvedValue(mockForm),
  setupError: () => formsService.duplicate.mockRejectedValue(new Error('Error')),
  req: { params: { id: 'form-1' }, user }
});

testHandler('publish', publish, {
  successStatus: 200, errorStatus: 400,
  setupSuccess: () => formsService.publish.mockResolvedValue(mockForm),
  setupError: () => formsService.publish.mockRejectedValue(new Error('Error')),
  req: { params: { id: 'form-1' }, user }
});

testHandler('close', close, {
  successStatus: 200, errorStatus: 400,
  setupSuccess: () => formsService.close.mockResolvedValue(mockForm),
  setupError: () => formsService.close.mockRejectedValue(new Error('Error')),
  req: { params: { id: 'form-1' }, user }
});
