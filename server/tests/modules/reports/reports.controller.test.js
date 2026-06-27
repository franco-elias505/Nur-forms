jest.mock('../../../src/modules/reports/reports.service');

const reportsService = require('../../../src/modules/reports/reports.service');
const { getSummary, getByQuestion, getIndividual, exportCSV, getMatchingKey } = require('../../../src/modules/reports/reports.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const user = { id: 'user-1', role: 'admin' };

beforeEach(() => jest.clearAllMocks());

describe('getSummary', () => {
  test('retorna 200 con resumen', async () => {
    reportsService.getSummary.mockResolvedValue({ total: 10 });
    const res = makeRes();
    await getSummary({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ total: 10 });
  });

  test('retorna 400 si falla', async () => {
    reportsService.getSummary.mockRejectedValue(new Error('Sin acceso'));
    const res = makeRes();
    await getSummary({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getByQuestion', () => {
  test('retorna 200 con estadísticas', async () => {
    reportsService.getByQuestion.mockResolvedValue([]);
    const res = makeRes();
    await getByQuestion({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    reportsService.getByQuestion.mockRejectedValue(new Error('Error'));
    const res = makeRes();
    await getByQuestion({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getIndividual', () => {
  test('retorna 200 con submissions', async () => {
    reportsService.getIndividual.mockResolvedValue([]);
    const res = makeRes();
    await getIndividual({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    reportsService.getIndividual.mockRejectedValue(new Error('Error'));
    const res = makeRes();
    await getIndividual({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('exportCSV', () => {
  test('retorna 200 con CSV y headers correctos', async () => {
    reportsService.exportCSV.mockResolvedValue('col1,col2');
    const res = makeRes();
    await exportCSV({ params: { formId: 'form-1' }, user }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="resultados-form-1.csv"');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('\uFEFFcol1,col2');
  });

  test('retorna 400 si falla', async () => {
    reportsService.exportCSV.mockRejectedValue(new Error('Sin acceso'));
    const res = makeRes();
    await exportCSV({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getMatchingKey', () => {
  test('retorna 200 con clave de matching', async () => {
    reportsService.getMatchingKey.mockResolvedValue([]);
    const res = makeRes();
    await getMatchingKey({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retorna 400 si falla', async () => {
    reportsService.getMatchingKey.mockRejectedValue(new Error('Error'));
    const res = makeRes();
    await getMatchingKey({ params: { formId: 'form-1' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
