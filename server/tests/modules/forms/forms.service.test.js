jest.mock('../../../src/models');

const { Form, Question, Option, CampaignMember, NotificationSetting } = require('../../../src/models');

const { getByCampaign, getById, getByToken, create, update, remove, publish, close } = require('../../../src/modules/forms/forms.service');

const makeForm = (overrides = {}) => ({
  id: 'form-1',
  title: 'Mi Formulario',
  status: 'draft',
  access_type: 'public',
  campaign_id: 'camp-1',
  created_by: 'user-1',
  opens_at: null,
  closes_at: null,
  update: jest.fn().mockResolvedValue({}),
  destroy: jest.fn().mockResolvedValue({}),
  ...overrides
});

// ───── getByCampaign ─────
describe('getByCampaign', () => {
  test('non-admin sin membresía lanza error', async () => {
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(getByCampaign('camp-1', 'user-1', 'creator'))
      .rejects.toThrow('No tenés acceso a esta campaña');
  });

  test('non-admin miembro puede ver los formularios', async () => {
    CampaignMember.findOne.mockResolvedValue({ id: 'mem-1' });
    Form.findAll.mockResolvedValue([makeForm()]);

    const result = await getByCampaign('camp-1', 'user-1', 'creator');
    expect(result).toHaveLength(1);
  });

  test('admin puede ver los formularios sin verificar membresía', async () => {
    Form.findAll.mockResolvedValue([makeForm()]);

    const result = await getByCampaign('camp-1', 'admin-1', 'admin');
    expect(CampaignMember.findOne).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});

// ───── getById ─────
describe('getById', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findByPk.mockResolvedValue(null);
    await expect(getById('bad-id', 'user-1', 'creator')).rejects.toThrow('Formulario no encontrado');
  });

  test('non-admin sin membresía no puede ver formulario privado', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ access_type: 'private' }));
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(getById('form-1', 'user-1', 'creator'))
      .rejects.toThrow('No tenés acceso a este formulario');
  });

  test('admin puede ver formulario privado sin membresía', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ access_type: 'private' }));

    const result = await getById('form-1', 'admin-1', 'admin');
    expect(result).toBeDefined();
    expect(CampaignMember.findOne).not.toHaveBeenCalled();
  });

  test('non-admin con membresía puede ver formulario privado', async () => {
    Form.findByPk.mockResolvedValue(makeForm({ access_type: 'private' }));
    CampaignMember.findOne.mockResolvedValue({ id: 'mem-1' });

    const result = await getById('form-1', 'user-1', 'creator');
    expect(result).toBeDefined();
  });
});

// ───── getByToken ─────
describe('getByToken', () => {
  test('lanza error si el formulario no existe', async () => {
    Form.findOne.mockResolvedValue(null);
    await expect(getByToken('bad-token')).rejects.toThrow('Formulario no encontrado');
  });

  test('lanza error si el formulario no está publicado', async () => {
    Form.findOne.mockResolvedValue(makeForm({ status: 'draft' }));
    await expect(getByToken('token-1')).rejects.toThrow('no está disponible');
  });

  test('lanza error si el formulario aún no abrió', async () => {
    const futureDate = new Date(Date.now() + 86400000); // mañana
    Form.findOne.mockResolvedValue(makeForm({ status: 'published', opens_at: futureDate }));

    await expect(getByToken('token-1')).rejects.toThrow('no está abierto');
  });

  test('lanza error si el formulario ya cerró', async () => {
    const pastDate = new Date(Date.now() - 86400000); // ayer
    Form.findOne.mockResolvedValue(makeForm({ status: 'published', closes_at: pastDate }));

    await expect(getByToken('token-1')).rejects.toThrow('ya cerró');
  });

  test('retorna el formulario si está publicado y disponible', async () => {
    Form.findOne.mockResolvedValue(makeForm({ status: 'published' }));
    const result = await getByToken('token-1');
    expect(result).toBeDefined();
    expect(result.status).toBe('published');
  });
});

// ───── create ─────
describe('create', () => {
  test('crea un formulario sin notification_settings', async () => {
    const newForm = makeForm({ id: 'new-form' });
    Form.create.mockResolvedValue(newForm);

    const result = await create({ title: 'Nuevo', campaign_id: 'camp-1' }, 'user-1');
    expect(Form.create).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'user-1' }));
    expect(result.id).toBe('new-form');
  });

  test('crea formulario con notification_settings si se pasan', async () => {
    const newForm = makeForm({ id: 'new-form' });
    Form.create.mockResolvedValue(newForm);
    NotificationSetting.create.mockResolvedValue({});

    await create({
      title: 'Con Notif',
      campaign_id: 'camp-1',
      notification_settings: { notify_on_threshold: 10 }
    }, 'user-1');

    expect(NotificationSetting.create).toHaveBeenCalledWith(
      expect.objectContaining({ form_id: 'new-form', notify_on_threshold: 10 })
    );
  });
});

// ───── publish ─────
describe('publish', () => {
  test('admin puede publicar cualquier formulario', async () => {
    const form = makeForm({ status: 'draft' });
    Form.findByPk.mockResolvedValue(form);

    await publish('form-1', 'admin-user', 'admin');

    expect(form.update).toHaveBeenCalledWith({ status: 'published' });
  });

  test('non-admin sin permisos no puede publicar', async () => {
    Form.findByPk.mockResolvedValue(makeForm());
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(publish('form-1', 'user-1', 'creator'))
      .rejects.toThrow('No tenés permisos');
  });

  test('editor puede publicar el formulario', async () => {
    const form = makeForm();
    Form.findByPk.mockResolvedValue(form);
    CampaignMember.findOne.mockResolvedValue({ role: 'editor' });

    await publish('form-1', 'user-1', 'creator');
    expect(form.update).toHaveBeenCalledWith({ status: 'published' });
  });
});

// ───── close ─────
describe('close', () => {
  test('admin puede cerrar cualquier formulario', async () => {
    const form = makeForm({ status: 'published' });
    Form.findByPk.mockResolvedValue(form);

    await close('form-1', 'admin-user', 'admin');
    expect(form.update).toHaveBeenCalledWith({ status: 'closed' });
  });
});

// ───── remove ─────
describe('remove', () => {
  test('admin puede eliminar cualquier formulario', async () => {
    const form = makeForm();
    Form.findByPk.mockResolvedValue(form);

    await remove('form-1', 'admin-user', 'admin');
    expect(form.destroy).toHaveBeenCalledTimes(1);
  });

  test('non-admin sin permisos no puede eliminar', async () => {
    Form.findByPk.mockResolvedValue(makeForm());
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(remove('form-1', 'user-1', 'creator'))
      .rejects.toThrow('No tenés permisos');
  });
});
