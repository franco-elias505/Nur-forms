jest.mock('../../../src/models');
jest.mock('../../../src/utils/mailer');

const { Submission, Answer, Form, Invitation, Question, NotificationSetting, User } = require('../../../src/models');
const { sendThresholdNotification, sendSubmissionConfirmation } = require('../../../src/utils/mailer');
const { start, saveAnswers, submit, getByForm, getByToken } = require('../../../src/modules/submissions/submissions.service');

const makeForm = (overrides = {}) => ({
  id: 'form-1',
  title: 'Test Form',
  status: 'published',
  access_type: 'public',
  campaign_id: 'camp-1',
  created_by: 'user-1',
  opens_at: null,
  closes_at: null,
  anonymous_mode: false,
  max_responses_per_user: null,
  ...overrides
});

const makeSubmission = (overrides = {}) => ({
  id: 'sub-1',
  form_id: 'form-1',
  is_complete: false,
  is_draft: true,
  invitation_id: null,
  update: jest.fn().mockResolvedValue({}),
  ...overrides
});

// ───── start ─────
describe('start', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(start('bad-form', 'user-1', null, '127.0.0.1'))
      .rejects.toThrow('Formulario no encontrado');
  });

  test('lanza error si el formulario no está publicado', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ status: 'draft' }));
    await expect(start('form-1', 'user-1', null, '127.0.0.1'))
      .rejects.toThrow('no está disponible');
  });

  test('lanza error si el formulario aún no abrió', async () => {
    const future = new Date(Date.now() + 86400000);
    Form.findByPk.mockResolvedValue(makeForm({ opens_at: future }));
    await expect(start('form-1', 'user-1', null, '127.0.0.1'))
      .rejects.toThrow('no está abierto');
  });

  test('lanza error si el formulario ya cerró', async () => {
    const past = new Date(Date.now() - 86400000);
    Form.findByPk.mockResolvedValue(makeForm({ closes_at: past }));
    await expect(start('form-1', 'user-1', null, '127.0.0.1'))
      .rejects.toThrow('ya cerró');
  });

  test('formulario privado sin token lanza error', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ access_type: 'private' }));
    await expect(start('form-1', 'user-1', null, '127.0.0.1'))
      .rejects.toThrow('token de invitación');
  });

  test('formulario privado con token inválido lanza error', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ access_type: 'private' }));
    Invitation.findOne.mockResolvedValue(null);
    await expect(start('form-1', 'user-1', 'bad-token', '127.0.0.1'))
      .rejects.toThrow('Token de invitación inválido');
  });

  test('lanza error si la invitación ya fue usada', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ access_type: 'private' }));
    Invitation.findOne.mockResolvedValue({ id: 'inv-1', status: 'submitted', update: jest.fn() });
    await expect(start('form-1', 'user-1', 'tok-1', '127.0.0.1'))
      .rejects.toThrow('ya fue usada');
  });

  test('lanza error si el usuario ya respondió (max_responses_per_user=1)', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ max_responses_per_user: 1 }));
    Submission.findOne
      .mockResolvedValueOnce({ id: 'existing-sub', is_complete: true }) // ya respondió
    ;
    await expect(start('form-1', 'user-1', null, '127.0.0.1'))
      .rejects.toThrow('Ya respondiste este formulario');
  });

  test('retorna el borrador existente si ya hay uno', async () => {
    Form.findByPk.mockResolvedValue(makeForm());
    const draft = makeSubmission({ is_draft: true });
    Submission.findOne.mockResolvedValue(draft);

    const result = await start('form-1', 'user-1', null, '127.0.0.1');
    expect(result).toEqual(draft);
    expect(Submission.create).not.toHaveBeenCalled();
  });

  test('crea nuevo submission si no hay borrador', async () => {
    Form.findByPk.mockResolvedValue(makeForm());
    Submission.findOne.mockResolvedValue(null); // no hay borrador
    const newSub = makeSubmission();
    Submission.create.mockResolvedValue(newSub);

    const result = await start('form-1', 'user-1', null, '127.0.0.1');
    expect(Submission.create).toHaveBeenCalled();
    expect(result).toEqual(newSub);
  });

  test('modo anónimo: user_id se guarda como null', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ anonymous_mode: true }));
    Submission.findOne.mockResolvedValue(null);
    Submission.create.mockResolvedValue(makeSubmission());

    await start('form-1', 'user-1', null, '127.0.0.1');
    expect(Submission.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null })
    );
  });
});

// ───── saveAnswers ─────
describe('saveAnswers', () => {
  test('lanza error si el submission no existe', async () => {
    Submission.findOne.mockResolvedValue(null);
    await expect(saveAnswers('sub-1', [], 'tok-1')).rejects.toThrow('Envío no encontrado');
  });

  test('lanza error si el submission ya fue completado', async () => {
    Submission.findOne.mockResolvedValue(makeSubmission({ is_complete: true }));
    await expect(saveAnswers('sub-1', [], 'tok-1')).rejects.toThrow('ya fue completado');
  });

  test('hace upsert de las respuestas recibidas', async () => {
    Submission.findOne.mockResolvedValue(makeSubmission());
    Answer.upsert.mockResolvedValue([{}]);

    const answers = [
      { question_id: 'q1', text_value: 'Respuesta 1' },
      { question_id: 'q2', selected_option_ids: ['opt-1'] }
    ];

    await saveAnswers('sub-1', answers, 'tok-1');
    expect(Answer.upsert).toHaveBeenCalledTimes(2);
    expect(Answer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_id: 'q1', text_value: 'Respuesta 1' })
    );
  });
});

// ───── submit ─────
describe('submit', () => {
  const mockSettings = { notify_on_threshold: null, threshold_notified_at: null, notify_respondent: false };
  const mockFormWithSettings = makeForm();

  const makeFullSubmission = (overrides = {}) => ({
    ...makeSubmission(),
    form: { ...mockFormWithSettings, notification_settings: mockSettings },
    invitation_id: null,
    respondent_email: null,
    update: jest.fn().mockResolvedValue({}),
    ...overrides
  });

  test('lanza error si el submission no existe', async () => {
    Submission.findOne.mockResolvedValue(null);
    await expect(submit('sub-1', 'tok-1')).rejects.toThrow('Envío no encontrado');
  });

  test('lanza error si el submission ya fue completado', async () => {
    Submission.findOne.mockResolvedValue({ ...makeFullSubmission(), is_complete: true });
    await expect(submit('sub-1', 'tok-1')).rejects.toThrow('ya fue completado');
  });

  test('lanza error si una pregunta requerida no fue respondida', async () => {
    const sub = makeFullSubmission();
    Submission.findOne.mockResolvedValue(sub);
    Question.findAll.mockResolvedValue([{ id: 'q-req', text: 'Pregunta obligatoria', is_required: true }]);
    Answer.findAll.mockResolvedValue([]); // sin respuestas

    await expect(submit('sub-1', 'tok-1')).rejects.toThrow('Pregunta obligatoria');
  });

  test('completa el submission exitosamente', async () => {
    const sub = makeFullSubmission();
    Submission.findOne.mockResolvedValue(sub);
    Question.findAll.mockResolvedValue([]); // sin preguntas requeridas
    Answer.findAll.mockResolvedValue([]);
    Submission.count.mockResolvedValue(5);

    await submit('sub-1', 'tok-1');
    expect(sub.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_complete: true, is_draft: false })
    );
  });

  test('envía notificación al creador cuando se alcanza el threshold', async () => {
    const settings = {
      notify_on_threshold: 10,
      threshold_notified_at: null,
      notify_respondent: false,
      update: jest.fn().mockResolvedValue({})
    };
    const sub = makeFullSubmission();
    sub.form.notification_settings = settings;
    Submission.findOne.mockResolvedValue(sub);
    Question.findAll.mockResolvedValue([]);
    Answer.findAll.mockResolvedValue([]);
    Submission.count.mockResolvedValue(10); // alcanzó el threshold
    User.findByPk.mockResolvedValue({ email: 'creator@nur.edu.bo' });
    sendThresholdNotification.mockResolvedValue({});

    await submit('sub-1', 'tok-1');

    expect(sendThresholdNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'creator@nur.edu.bo', count: 10 })
    );
    expect(settings.update).toHaveBeenCalledWith({ threshold_notified_at: expect.any(Date) });
  });
});

// ───── getByToken ─────
describe('getByToken', () => {
  test('lanza error si el submission no existe', async () => {
    Submission.findOne.mockResolvedValue(null);
    await expect(getByToken('bad-token')).rejects.toThrow('Envío no encontrado');
  });

  test('retorna el submission con sus respuestas', async () => {
    const sub = { ...makeSubmission(), answers: [{ id: 'ans-1' }] };
    Submission.findOne.mockResolvedValue(sub);
    const result = await getByToken('tok-1');
    expect(result.answers).toHaveLength(1);
  });
});

// ───── getByForm ─────
describe('getByForm', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(getByForm('bad-form', 'user-1', 'admin')).rejects.toThrow('Formulario no encontrado');
  });

  test('retorna lista de submissions completos', async () => {
    Form.findByPk.mockResolvedValue(makeForm());
    Submission.findAll.mockResolvedValue([makeSubmission({ is_complete: true })]);

    const result = await getByForm('form-1', 'admin-1', 'admin');
    expect(result).toHaveLength(1);
  });
});
