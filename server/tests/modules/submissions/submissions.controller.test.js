jest.mock('../../../src/modules/submissions/submissions.service');

const submissionsService = require('../../../src/modules/submissions/submissions.service');
const { start, saveAnswers, submit, getByForm, getByToken } = require('../../../src/modules/submissions/submissions.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockSubmission = { id: 'sub-1', form_id: 'form-1' };

beforeEach(() => jest.clearAllMocks());

describe('start', () => {
  test('retorna 201 al iniciar submission', async () => {
    submissionsService.start.mockResolvedValue(mockSubmission);
    const req = {
      params: { formId: 'form-1' },
      body: { invitationToken: 'tok' },
      user: { id: 'user-1' },
      ip: '127.0.0.1'
    };
    const res = makeRes();
    await start(req, res);
    expect(submissionsService.start).toHaveBeenCalledWith('form-1', 'user-1', 'tok', '127.0.0.1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('permite usuario anónimo (userId null)', async () => {
    submissionsService.start.mockResolvedValue(mockSubmission);
    const req = { params: { formId: 'form-1' }, body: {}, ip: '127.0.0.1' };
    const res = makeRes();
    await start(req, res);
    expect(submissionsService.start).toHaveBeenCalledWith('form-1', null, undefined, '127.0.0.1');
  });

  test('retorna 400 si falla', async () => {
    submissionsService.start.mockRejectedValue(new Error('Formulario cerrado'));
    const req = { params: { formId: 'form-1' }, body: {}, ip: '127.0.0.1' };
    const res = makeRes();
    await start(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('saveAnswers', () => {
  test('retorna 200 al guardar respuestas', async () => {
    submissionsService.saveAnswers.mockResolvedValue(mockSubmission);
    const req = { params: { id: 'sub-1' }, body: { answers: [], respondentToken: 'rt' } };
    const res = makeRes();
    await saveAnswers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    submissionsService.saveAnswers.mockRejectedValue(new Error('Token inválido'));
    const req = { params: { id: 'sub-1' }, body: {} };
    const res = makeRes();
    await saveAnswers(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('submit', () => {
  test('retorna 200 al enviar', async () => {
    submissionsService.submit.mockResolvedValue({ ...mockSubmission, is_complete: true });
    const req = { params: { id: 'sub-1' }, body: { respondentToken: 'rt' } };
    const res = makeRes();
    await submit(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    submissionsService.submit.mockRejectedValue(new Error('Incomplete'));
    const req = { params: { id: 'sub-1' }, body: {} };
    const res = makeRes();
    await submit(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getByForm', () => {
  test('retorna 200 con submissions', async () => {
    submissionsService.getByForm.mockResolvedValue([mockSubmission]);
    const req = { params: { formId: 'form-1' }, user: { id: 'user-1', role: 'admin' } };
    const res = makeRes();
    await getByForm(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    submissionsService.getByForm.mockRejectedValue(new Error('Sin acceso'));
    const req = { params: { formId: 'form-1' }, user: { id: 'user-1', role: 'creator' } };
    const res = makeRes();
    await getByForm(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getByToken', () => {
  test('retorna 200 con submission', async () => {
    submissionsService.getByToken.mockResolvedValue(mockSubmission);
    const res = makeRes();
    await getByToken({ params: { token: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 404 si no existe', async () => {
    submissionsService.getByToken.mockRejectedValue(new Error('No encontrada'));
    const res = makeRes();
    await getByToken({ params: { token: 'bad' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
