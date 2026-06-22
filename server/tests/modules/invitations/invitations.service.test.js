jest.mock('../../../src/models');
jest.mock('../../../src/utils/mailer');

const { Invitation, Form, CampaignMember } = require('../../../src/models');
const { sendInvitation } = require('../../../src/utils/mailer');
const { getByForm, create, remove, validate } = require('../../../src/modules/invitations/invitations.service');

const mockForm = {
  id: 'form-1',
  title: 'Encuesta Test',
  campaign_id: 'camp-1'
};

const mockInvitation = {
  id: 'inv-1',
  form_id: 'form-1',
  email: 'user@nur.edu.bo',
  token: 'tok-abc',
  status: 'pending',
  expires_at: null,
  update: jest.fn().mockResolvedValue({}),
  destroy: jest.fn().mockResolvedValue({})
};

// ───── validate ─────
describe('validate', () => {
  test('lanza error si el token no existe', async () => {
    Invitation.findOne.mockResolvedValue(null);
    await expect(validate('form-1', 'bad-token')).rejects.toThrow('Token inválido');
  });

  test('lanza error si la invitación ya fue usada', async () => {
    Invitation.findOne.mockResolvedValue({ ...mockInvitation, status: 'submitted' });
    await expect(validate('form-1', 'tok-abc')).rejects.toThrow('ya fue usada');
  });

  test('lanza error y actualiza estado si la invitación expiró', async () => {
    const expired = {
      ...mockInvitation,
      expires_at: new Date(Date.now() - 1000), // ya pasó
      update: jest.fn().mockResolvedValue({})
    };
    Invitation.findOne.mockResolvedValue(expired);

    await expect(validate('form-1', 'tok-abc')).rejects.toThrow('expiró');
    expect(expired.update).toHaveBeenCalledWith({ status: 'expired' });
  });

  test('retorna valid:true y el email si la invitación es válida', async () => {
    Invitation.findOne.mockResolvedValue({ ...mockInvitation, expires_at: null });

    const result = await validate('form-1', 'tok-abc');
    expect(result).toEqual({ valid: true, email: 'user@nur.edu.bo' });
  });

  test('invitación válida con fecha de expiración futura', async () => {
    const futureExpiry = new Date(Date.now() + 86400000);
    Invitation.findOne.mockResolvedValue({ ...mockInvitation, expires_at: futureExpiry });

    const result = await validate('form-1', 'tok-abc');
    expect(result.valid).toBe(true);
  });
});

// ───── getByForm ─────
describe('getByForm', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(getByForm('bad-form', 'user-1', 'creator')).rejects.toThrow('Formulario no encontrado');
  });

  test('non-admin sin permisos no puede ver invitaciones', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(getByForm('form-1', 'user-1', 'creator')).rejects.toThrow('No tenés permisos');
  });

  test('admin puede ver invitaciones sin membresía', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Invitation.findAll.mockResolvedValue([mockInvitation]);

    const result = await getByForm('form-1', 'admin-1', 'admin');
    expect(result).toHaveLength(1);
    expect(CampaignMember.findOne).not.toHaveBeenCalled();
  });
});

// ───── create ─────
describe('create', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(create('bad-form', ['a@nur.edu.bo'], 'user-1', 'admin', 'http://localhost'))
      .rejects.toThrow('Formulario no encontrado');
  });

  test('retorna already_invited si el email ya fue invitado', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Invitation.findOne.mockResolvedValue(mockInvitation); // ya existe

    const result = await create('form-1', ['user@nur.edu.bo'], 'admin-1', 'admin', 'http://localhost');
    expect(result).toEqual([{ email: 'user@nur.edu.bo', status: 'already_invited' }]);
  });

  test('envía invitación y retorna status sent', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Invitation.findOne.mockResolvedValue(null); // no existe
    const newInv = { ...mockInvitation, update: jest.fn().mockResolvedValue({}) };
    Invitation.create.mockResolvedValue(newInv);
    sendInvitation.mockResolvedValue({});

    const result = await create('form-1', ['nuevo@nur.edu.bo'], 'admin-1', 'admin', 'http://localhost');
    expect(result[0].status).toBe('sent');
    expect(sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'nuevo@nur.edu.bo', formTitle: 'Encuesta Test' })
    );
  });

  test('retorna email_failed si el envío de email falla', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    Invitation.findOne.mockResolvedValue(null);
    Invitation.create.mockResolvedValue({ ...mockInvitation, update: jest.fn() });
    sendInvitation.mockRejectedValue(new Error('SMTP Error'));

    const result = await create('form-1', ['fail@nur.edu.bo'], 'admin-1', 'admin', 'http://localhost');
    expect(result[0].status).toBe('email_failed');
    expect(result[0].token).toBe('tok-abc');
  });

  test('procesa múltiples emails de forma independiente', async () => {
    Form.findByPk.mockResolvedValue(mockForm);
    // Primer email: ya invitado / Segundo: nuevo
    Invitation.findOne
      .mockResolvedValueOnce(mockInvitation) // ya existe
      .mockResolvedValueOnce(null);           // no existe
    Invitation.create.mockResolvedValue({ ...mockInvitation, email: 'nuevo@nur.edu.bo', update: jest.fn() });
    sendInvitation.mockResolvedValue({});

    const result = await create('form-1', ['user@nur.edu.bo', 'nuevo@nur.edu.bo'], 'admin-1', 'admin', 'http://localhost');
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('already_invited');
    expect(result[1].status).toBe('sent');
  });
});

// ───── remove ─────
describe('remove', () => {
  test('lanza error si la invitación no existe', async () => {
    Invitation.findByPk.mockResolvedValue(null);
    await expect(remove('bad-inv', 'user-1', 'admin')).rejects.toThrow('Invitación no encontrada');
  });

  test('admin puede eliminar invitación', async () => {
    const inv = { ...mockInvitation, destroy: jest.fn().mockResolvedValue({}) };
    Invitation.findByPk.mockResolvedValue(inv);
    Form.findByPk.mockResolvedValue(mockForm);

    await remove('inv-1', 'admin-1', 'admin');
    expect(inv.destroy).toHaveBeenCalledTimes(1);
  });
});
