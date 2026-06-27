jest.mock('../../../src/models');

const { Form, Question, Option, Submission, Answer, CampaignMember } = require('../../../src/models');
const { getSummary, getByQuestion, exportCSV } = require('../../../src/modules/reports/reports.service');

const mockForm = {
  id: 'form-1',
  title: 'Reporte Test',
  status: 'published',
  campaign_id: 'camp-1'
};

// ───── getSummary ─────
describe('getSummary', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(getSummary('bad-form', 'user-1', 'admin')).rejects.toThrow('Formulario no encontrado');
  });

  test('non-admin sin membresía no puede ver el reporte', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(getSummary('form-1', 'user-1', 'creator'))
      .rejects.toThrow('No tenés acceso a este formulario');
  });

  test('retorna completion_rate = 0 cuando no hay submissions', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Submission.count
      .mockResolvedValueOnce(0)  // total
      .mockResolvedValueOnce(0)  // completed
      .mockResolvedValueOnce(0); // drafts

    const result = await getSummary('form-1', 'admin-1', 'admin');
    expect(result.completion_rate).toBe(0);
    expect(result.total_submissions).toBe(0);
  });

  test('calcula el completion_rate correctamente', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Submission.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(7)  // completed
      .mockResolvedValueOnce(3); // drafts

    const result = await getSummary('form-1', 'admin-1', 'admin');
    expect(result.completion_rate).toBe(70);
    expect(result.completed_submissions).toBe(7);
    expect(result.draft_submissions).toBe(3);
  });

  test('retorna la estructura esperada del resumen', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Submission.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);

    const result = await getSummary('form-1', 'admin-1', 'admin');
    expect(result).toMatchObject({
      form_id: 'form-1',
      form_title: 'Reporte Test',
      form_status: 'published',
      total_submissions: 5,
      completed_submissions: 5,
      draft_submissions: 0,
      completion_rate: 100
    });
  });

  test('redondea el completion_rate al entero más cercano', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Submission.count
      .mockResolvedValueOnce(3)  // total
      .mockResolvedValueOnce(1)  // completed (33.33...)
      .mockResolvedValueOnce(2);

    const result = await getSummary('form-1', 'admin-1', 'admin');
    expect(result.completion_rate).toBe(33);
  });
});

// ───── getByQuestion ─────
describe('getByQuestion', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(getByQuestion('bad-form', 'user-1', 'admin')).rejects.toThrow('Formulario no encontrado');
  });

  test('genera estadísticas para pregunta de single_choice', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    const options = [
      { id: 'opt-1', text: 'Opción A', is_correct: false },
      { id: 'opt-2', text: 'Opción B', is_correct: true }
    ];
    Question.findAll.mockResolvedValue([
      { id: 'q1', text: '¿Pregunta?', type: 'single_choice', options }
    ]);
    Answer.findAll.mockResolvedValue([
      { selected_option_ids: ['opt-1'] },
      { selected_option_ids: ['opt-2'] },
      { selected_option_ids: ['opt-1'] }
    ]);

    const result = await getByQuestion('form-1', 'admin-1', 'admin');
    expect(result).toHaveLength(1);
    const optStats = result[0].options;
    const optA = optStats.find(o => o.text === 'Opción A');
    const optB = optStats.find(o => o.text === 'Opción B');
    expect(optA.count).toBe(2);
    expect(optB.count).toBe(1);
  });

  test('genera estadísticas para pregunta true_false', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([
      { id: 'q2', text: '¿Verdadero o Falso?', type: 'true_false', options: [] }
    ]);
    Answer.findAll.mockResolvedValue([
      { boolean_value: true },
      { boolean_value: true },
      { boolean_value: false }
    ]);

    const result = await getByQuestion('form-1', 'admin-1', 'admin');
    const stats = result[0];
    const verdadero = stats.options.find(o => o.text === 'Verdadero');
    const falso = stats.options.find(o => o.text === 'Falso');
    expect(verdadero.count).toBe(2);
    expect(falso.count).toBe(1);
  });

  test('genera estadísticas de texto para preguntas short_text', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([
      { id: 'q3', text: '¿Comentarios?', type: 'short_text', options: [] }
    ]);
    Answer.findAll.mockResolvedValue([
      { text_value: 'Respuesta 1' },
      { text_value: 'Respuesta 2' },
      { text_value: null }
    ]);

    const result = await getByQuestion('form-1', 'admin-1', 'admin');
    expect(result[0].responses).toEqual(['Respuesta 1', 'Respuesta 2']);
  });
});

// ───── exportCSV ─────
describe('exportCSV', () => {
  beforeEach(() => {
    Option.findAll.mockResolvedValue([]);
  });

  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(exportCSV('bad-form', 'user-1', 'admin')).rejects.toThrow('Formulario no encontrado');
  });

  test('genera CSV con encabezados correctos', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([
      { id: 'q1', text: 'Pregunta 1' },
      { id: 'q2', text: 'Pregunta 2' }
    ]);
    Submission.findAll.mockResolvedValue([]);

    const csv = await exportCSV('form-1', 'admin-1', 'admin');
    const headers = csv.split('\n')[0];
    expect(headers).toContain('submission_id');
    expect(headers).toContain('submitted_at');
    expect(headers).toContain('Pregunta 1');
    expect(headers).toContain('Pregunta 2');
  });

  test('genera una fila por submission', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([{ id: 'q1', text: 'Q1' }]);
    Submission.findAll.mockResolvedValue([
      {
        id: 'sub-1',
        submitted_at: new Date('2024-01-01'),
        ip_address: '127.0.0.1',
        answers: [{ question_id: 'q1', text_value: 'Resp', boolean_value: null, selected_option_ids: [], matching_pairs: [] }]
      },
      {
        id: 'sub-2',
        submitted_at: new Date('2024-01-02'),
        ip_address: '127.0.0.2',
        answers: []
      }
    ]);

    const csv = await exportCSV('form-1', 'admin-1', 'admin');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 submissions
    expect(lines[1]).toContain('sub-1');
    expect(lines[1]).toContain('Resp');
    expect(lines[2]).toContain('sub-2');
  });

  test('exporta boolean_value como Verdadero/Falso en el CSV', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([{ id: 'q1', text: 'TF' }]);
    Submission.findAll.mockResolvedValue([{
      id: 'sub-1',
      submitted_at: new Date(),
      ip_address: null,
      answers: [{ question_id: 'q1', text_value: null, boolean_value: true, selected_option_ids: [], matching_pairs: [] }]
    }]);

    const csv = await exportCSV('form-1', 'admin-1', 'admin');
    expect(csv).toContain('Verdadero');
  });

  test('CSV vacío (solo headers) si no hay submissions', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([{ id: 'q1', text: 'Q1' }]);
    Submission.findAll.mockResolvedValue([]);

    const csv = await exportCSV('form-1', 'admin-1', 'admin');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // solo header
  });
});
