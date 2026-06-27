jest.mock('../../../src/modules/questions/questions.service');

const questionsService = require('../../../src/modules/questions/questions.service');
const { getByForm, create, update, remove, reorder } = require('../../../src/modules/questions/questions.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const user = { id: 'user-1', role: 'creator' };
const mockQuestion = { id: 'q1', text: 'Pregunta?' };

beforeEach(() => jest.clearAllMocks());

describe('getByForm', () => {
  test('retorna 200 con preguntas', async () => {
    questionsService.getByForm.mockResolvedValue([mockQuestion]);
    const res = makeRes();
    await getByForm({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([mockQuestion]);
  });

  test('retorna 403 sin permisos', async () => {
    questionsService.getByForm.mockRejectedValue(new Error('No tenés permisos'));
    const res = makeRes();
    await getByForm({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('create', () => {
  test('retorna 201 al crear', async () => {
    questionsService.create.mockResolvedValue(mockQuestion);
    const res = makeRes();
    await create({ params: { formId: 'form-1' }, body: { text: 'Nueva' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('retorna 400 si falla', async () => {
    questionsService.create.mockRejectedValue(new Error('Datos inválidos'));
    const res = makeRes();
    await create({ params: { formId: 'form-1' }, body: {}, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('update', () => {
  test('retorna 200 al actualizar', async () => {
    questionsService.update.mockResolvedValue(mockQuestion);
    const res = makeRes();
    await update({ params: { id: 'q1' }, body: { text: 'Editada' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    questionsService.update.mockRejectedValue(new Error('No encontrada'));
    const res = makeRes();
    await update({ params: { id: 'q1' }, body: {}, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('remove', () => {
  test('retorna 204 al eliminar', async () => {
    questionsService.remove.mockResolvedValue(undefined);
    const res = makeRes();
    await remove({ params: { id: 'q1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  test('retorna 400 si falla', async () => {
    questionsService.remove.mockRejectedValue(new Error('No encontrada'));
    const res = makeRes();
    await remove({ params: { id: 'q1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('reorder', () => {
  test('retorna 200 con preguntas reordenadas', async () => {
    questionsService.reorder.mockResolvedValue([mockQuestion]);
    const res = makeRes();
    await reorder({ params: { formId: 'form-1' }, body: { orderedIds: ['q1'] }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    questionsService.reorder.mockRejectedValue(new Error('Error'));
    const res = makeRes();
    await reorder({ params: { formId: 'form-1' }, body: { orderedIds: [] }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
