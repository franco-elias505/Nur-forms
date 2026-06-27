jest.mock('../../../src/models');

const { Question, Option, Form, CampaignMember } = require('../../../src/models');
const { getByForm, create, update, remove, reorder } = require('../../../src/modules/questions/questions.service');

const mockForm = { id: 'form-1', campaign_id: 'camp-1' };
const mockQuestion = {
  id: 'q1',
  form_id: 'form-1',
  text: 'Pregunta?',
  position: 0,
  update: jest.fn().mockResolvedValue({}),
  destroy: jest.fn().mockResolvedValue({})
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuestion.update.mockClear();
  mockQuestion.destroy.mockClear();
});

describe('getByForm', () => {
  test('admin obtiene preguntas sin verificar membresía', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findAll.mockResolvedValue([mockQuestion]);

    const result = await getByForm('form-1', 'admin-1', 'admin');

    expect(CampaignMember.findOne).not.toHaveBeenCalled();
    expect(Question.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { form_id: 'form-1' }
    }));
    expect(result).toEqual([mockQuestion]);
  });

  test('creator sin permisos lanza error', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(getByForm('form-1', 'user-1', 'creator'))
      .rejects.toThrow('No tenés permisos sobre este formulario');
  });

  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);

    await expect(getByForm('bad', 'user-1', 'creator'))
      .rejects.toThrow('Formulario no encontrado');
  });
});

describe('create', () => {
  test('crea pregunta con position 0 si no hay preguntas previas', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findOne.mockResolvedValue(null);
    Question.create.mockResolvedValue({ id: 'q-new', text: 'Nueva', form_id: 'form-1', position: 0 });
    Question.findByPk.mockResolvedValue({ id: 'q-new', text: 'Nueva', options: [] });

    const result = await create('form-1', { text: 'Nueva', type: 'text' }, 'admin-1', 'admin');

    expect(Question.create).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Nueva',
      form_id: 'form-1',
      position: 0
    }));
    expect(result).toBeDefined();
  });

  test('crea opciones para preguntas de choice', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.findOne.mockResolvedValue({ position: 2 });
    Question.create.mockResolvedValue({ id: 'q-new' });
    Question.findByPk.mockResolvedValue({ id: 'q-new', options: [] });

    await create('form-1', {
      text: 'Elegir',
      type: 'single_choice',
      options: [{ text: 'A' }, { text: 'B' }]
    }, 'admin-1', 'admin');

    expect(Option.create).toHaveBeenCalledTimes(2);
    expect(Option.create).toHaveBeenCalledWith(expect.objectContaining({
      question_id: 'q-new',
      text: 'A',
      position: 0
    }));
  });
});

describe('update', () => {
  test('lanza error si la pregunta no existe', async () => {
    Question.findByPk.mockResolvedValue(null);
    await expect(update('bad', {}, 'user-1', 'admin')).rejects.toThrow('Pregunta no encontrada');
  });

  test('actualiza pregunta y reemplaza opciones', async () => {
    Question.findByPk
      .mockResolvedValueOnce(mockQuestion)
      .mockResolvedValueOnce({ ...mockQuestion, options: [] });
    Form.findByPk.mockResolvedValue(mockForm);

    await update('q1', { text: 'Editada', options: [{ text: 'Opt' }] }, 'admin-1', 'admin');

    expect(mockQuestion.update).toHaveBeenCalledWith({ text: 'Editada', options: [{ text: 'Opt' }] });
    expect(Option.destroy).toHaveBeenCalledWith({ where: { question_id: 'q1' } });
    expect(Option.create).toHaveBeenCalled();
  });
});

describe('remove', () => {
  test('lanza error si la pregunta no existe', async () => {
    Question.findByPk.mockResolvedValue(null);
    await expect(remove('bad', 'user-1', 'admin')).rejects.toThrow('Pregunta no encontrada');
  });

  test('elimina la pregunta con acceso válido', async () => {
    Question.findByPk.mockResolvedValue(mockQuestion);
    Form.findByPk.mockResolvedValue(mockForm);

    await remove('q1', 'admin-1', 'admin');

    expect(mockQuestion.destroy).toHaveBeenCalled();
  });
});

describe('reorder', () => {
  test('actualiza posiciones y retorna preguntas ordenadas', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Question.update.mockResolvedValue([1]);
    Question.findAll.mockResolvedValue([mockQuestion]);

    const result = await reorder('form-1', ['q2', 'q1'], 'admin-1', 'admin');

    expect(Question.update).toHaveBeenCalledTimes(2);
    expect(Question.update).toHaveBeenCalledWith({ position: 0 }, { where: { id: 'q2', form_id: 'form-1' } });
    expect(result).toEqual([mockQuestion]);
  });
});
