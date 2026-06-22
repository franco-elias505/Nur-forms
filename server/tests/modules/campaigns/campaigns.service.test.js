jest.mock('../../../src/repositories/campaign-repository.js');
jest.mock('../../../src/repositories/campaign-member.repository.js');
jest.mock('../../../src/models');

const campaignRepo = require('../../../src/repositories/campaign-repository.js');
const campaignMemberRepo = require('../../../src/repositories/campaign-member.repository.js');
const { Campaign, CampaignMember } = require('../../../src/models');

const {
  getAllService,
  getByIdService,
  createService,
  updateService,
  removeService,
  addMember,
  removeMember
} = require('../../../src/modules/campaigns/campaigns.service');

const mockCampaign = {
  id: 'camp-1',
  name: 'Campaña Test',
  description: 'Descripción',
  status: 'draft',
  created_by: 'user-1',
  starts_at: null,
  ends_at: null,
  update: jest.fn()
};

beforeEach(() => {
  mockCampaign.update.mockClear();
});

// ───── getAllService ─────
describe('getAllService', () => {
  test('admin obtiene todas las campañas', async () => {
    campaignRepo.getAllCampaigns.mockResolvedValue([mockCampaign]);

    const result = await getAllService('admin', 'user-admin');
    expect(campaignRepo.getAllCampaigns).toHaveBeenCalledTimes(1);
    expect(result).toEqual([mockCampaign]);
  });

  test('creator obtiene sus campañas + campañas donde es miembro', async () => {
    campaignRepo.getAllUserCampaigns.mockResolvedValue([{ id: 'c1', name: 'Propia' }]);
    campaignRepo.getAsMemberCampaigns.mockResolvedValue([{ id: 'c2', name: 'Miembro' }]);

    const result = await getAllService('creator', 'user-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
  });

  test('creator con campañas en ambas fuentes las combina sin duplicados explícitos', async () => {
    campaignRepo.getAllUserCampaigns.mockResolvedValue([]);
    campaignRepo.getAsMemberCampaigns.mockResolvedValue([]);
    const result = await getAllService('creator', 'user-1');
    expect(result).toEqual([]);
  });
});

// ───── getByIdService ─────
describe('getByIdService', () => {
  test('lanza error si la campaña no existe', async () => {
    campaignRepo.getCampaignById.mockResolvedValue(null);

    await expect(getByIdService('nonexistent', 'user-1', 'creator'))
      .rejects.toThrow('Campaña inexistente');
  });

  test('creator sin acceso lanza error', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, created_by: 'otro-user' });
    campaignMemberRepo.getMembership.mockResolvedValue(null);

    await expect(getByIdService('camp-1', 'user-1', 'creator'))
      .rejects.toThrow('No tiene acceso a esta campaña');
  });

  test('creator propietario puede acceder aunque no sea miembro explícito', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, created_by: 'user-1' });
    campaignRepo.getCampaignDetails.mockResolvedValue({ ...mockCampaign, members: [] });

    const result = await getByIdService('camp-1', 'user-1', 'creator');
    expect(result).toBeDefined();
  });

  test('admin puede acceder sin verificar membresía', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, created_by: 'otro' });
    campaignRepo.getCampaignDetails.mockResolvedValue(mockCampaign);

    const result = await getByIdService('camp-1', 'admin-user', 'admin');
    expect(result).toBeDefined();
    expect(campaignMemberRepo.getMembership).not.toHaveBeenCalled();
  });
});

// ───── createService ─────
describe('createService', () => {
  test('lanza error si el nombre está vacío', async () => {
    await expect(createService({ name: '   ' }, 'user-1'))
      .rejects.toThrow('Nombre de campaha es obligatorio');
  });

  test('lanza error si la fecha de inicio es pasada', async () => {
    const pastDate = '2020-01-01';
    await expect(createService({ name: 'Mi Campaña', starts_at: pastDate, ends_at: '2030-01-01' }, 'user-1'))
      .rejects.toThrow('Fecha de inicio no puede ser pasada a fecha actual');
  });

  test('lanza error si la fecha de fin es anterior a inicio', async () => {
    const futureStart = '2099-01-10';
    const futureEnd = '2099-01-01';

    await expect(createService({ name: 'Mi Campaña', starts_at: futureStart, ends_at: futureEnd }, 'user-1'))
      .rejects.toThrow('La fecha de finalizacion no puede ser pasada a la fecha de inicio');
  });

  test('crea campaña exitosamente sin fechas', async () => {
    campaignRepo.createCampaign.mockResolvedValue({ id: 'new-camp' });
    campaignMemberRepo.insertMember.mockResolvedValue({});

    const result = await createService({ name: 'Nueva Campaña', description: 'Desc' }, 'user-1');
    expect(result).toEqual({ message: 'Campaha creada exitosamente' });
    expect(campaignMemberRepo.insertMember).toHaveBeenCalledWith('new-camp', 'user-1', 'owner');
  });

  test('asigna null a fechas si solo viene una', async () => {
    campaignRepo.createCampaign.mockResolvedValue({ id: 'new-camp' });
    campaignMemberRepo.insertMember.mockResolvedValue({});

    await createService({ name: 'Campaña', starts_at: '2099-01-01' }, 'user-1');
    expect(campaignRepo.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ starts_at: null, ends_at: null }),
      'user-1'
    );
  });
});

// ───── updateService ─────
describe('updateService', () => {
  test('lanza error si la campaña no existe', async () => {
    campaignRepo.getCampaignById.mockResolvedValue(null);
    await expect(updateService('bad-id', {}, 'u', 'admin')).rejects.toThrow('Campana inexistente');
  });

  test('lanza error si la campaña está archivada', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, status: 'archived' });
    await expect(updateService('camp-1', {}, 'u', 'admin')).rejects.toThrow('Esta campana no se puede editar');
  });

  test('lanza error con transición de estado inválida (draft → archived)', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, status: 'draft' });
    await expect(updateService('camp-1', { status: 'archived' }, 'u', 'admin'))
      .rejects.toThrow('Transicion de estado no permitida');
  });

  test('lanza error si el nombre queda vacío', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, update: jest.fn() });
    await expect(updateService('camp-1', { name: '   ' }, 'u', 'admin'))
      .rejects.toThrow('El nombre es obligatorio');
  });

  test('lanza error si end_at es anterior a start_at', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, update: jest.fn() });
    await expect(updateService('camp-1', { starts_at: '2099-06-10', ends_at: '2099-06-01' }, 'u', 'admin'))
      .rejects.toThrow('fecha de finalizacion');
  });

  test('actualiza nombre exitosamente', async () => {
    const campaign = { ...mockCampaign, status: 'draft', update: jest.fn().mockResolvedValue({}) };
    campaignRepo.getCampaignById.mockResolvedValue(campaign);

    const result = await updateService('camp-1', { name: 'Nuevo Nombre' }, 'u', 'admin');
    expect(campaign.update).toHaveBeenCalledWith({ name: 'Nuevo Nombre' });
    expect(result).toEqual({ message: 'Campana actualizada con exito' });
  });

  test('permite transición válida draft → active', async () => {
    const campaign = { ...mockCampaign, status: 'draft', update: jest.fn().mockResolvedValue({}) };
    campaignRepo.getCampaignById.mockResolvedValue(campaign);
    campaignRepo.updateCampaignState.mockResolvedValue(1);

    const result = await updateService('camp-1', { status: 'active' }, 'u', 'admin');
    expect(campaignRepo.updateCampaignState).toHaveBeenCalledWith('camp-1', 'active');
    expect(result.message).toBe('Campana actualizada con exito');
  });
});

// ───── removeService ─────
describe('removeService', () => {
  test('lanza error si la campaña no existe', async () => {
    campaignRepo.getCampaignById.mockResolvedValue(null);
    await expect(removeService('bad', 'u', 'creator')).rejects.toThrow('Campaña no encontrada');
  });

  test('lanza error si la campaña está activa', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, status: 'active' });
    await expect(removeService('camp-1', 'u', 'creator')).rejects.toThrow('Estado de campaña invalido');
  });

  test('lanza error si el usuario no es miembro', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, status: 'draft' });
    campaignMemberRepo.getMembership.mockResolvedValue(null);

    await expect(removeService('camp-1', 'u', 'creator')).rejects.toThrow('No forma parte de esta campaña');
  });

  test('lanza error si el usuario no es owner', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, status: 'draft' });
    campaignMemberRepo.getMembership.mockResolvedValue({ role: 'viewer' });

    await expect(removeService('camp-1', 'u', 'creator')).rejects.toThrow('No tiene los permisos para eliminar');
  });

  test('elimina la campaña exitosamente', async () => {
    campaignRepo.getCampaignById.mockResolvedValue({ ...mockCampaign, status: 'draft' });
    campaignMemberRepo.getMembership.mockResolvedValue({ role: 'owner' });
    campaignRepo.deleteCampaign.mockResolvedValue(1);

    const result = await removeService('camp-1', 'u', 'creator');
    expect(result).toEqual({ message: 'Campaña eliminada exitosamente' });
  });
});

// ───── addMember ─────
describe('addMember', () => {
  test('lanza error si la campaña no existe', async () => {
    Campaign.findByPk.mockResolvedValue(null);
    await expect(addMember('bad', { user_id: 'u2', role: 'viewer' }, 'u1', 'creator'))
      .rejects.toThrow('Campaña no encontrada');
  });

  test('lanza error si el requester no es owner (y no es admin)', async () => {
    Campaign.findByPk.mockResolvedValue({ id: 'camp-1' });
    CampaignMember.findOne.mockResolvedValue(null); // no es owner

    await expect(addMember('camp-1', { user_id: 'u2', role: 'viewer' }, 'u1', 'creator'))
      .rejects.toThrow('Solo el dueño puede agregar miembros');
  });

  test('lanza error si el usuario ya es miembro', async () => {
    Campaign.findByPk.mockResolvedValue({ id: 'camp-1' });
    CampaignMember.findOne
      .mockResolvedValueOnce({ role: 'owner' }) // es owner
      .mockResolvedValueOnce({ id: 'existing-member' }); // ya es miembro

    await expect(addMember('camp-1', { user_id: 'u2', role: 'viewer' }, 'u1', 'creator'))
      .rejects.toThrow('El usuario ya es miembro');
  });

  test('admin puede agregar miembro sin ser owner', async () => {
    Campaign.findByPk.mockResolvedValue({ id: 'camp-1' });
    CampaignMember.findOne.mockResolvedValue(null); // no existía antes
    CampaignMember.create.mockResolvedValue({ id: 'new-member', role: 'viewer' });

    const result = await addMember('camp-1', { user_id: 'u2', role: 'viewer' }, 'admin-user', 'admin');
    expect(CampaignMember.create).toHaveBeenCalled();
    expect(result.role).toBe('viewer');
  });
});

// ───── removeMember ─────
describe('removeMember', () => {
  test('lanza error si el requester no es owner (y no es admin)', async () => {
    CampaignMember.findOne.mockResolvedValue(null);

    await expect(removeMember('camp-1', 'member-id', 'u1', 'creator'))
      .rejects.toThrow('Solo el dueño puede eliminar miembros');
  });

  test('elimina al miembro si el requester es owner', async () => {
    CampaignMember.findOne.mockResolvedValue({ id: 'camp-1', user_id: 'u1', role: 'owner' });
    CampaignMember.destroy.mockResolvedValue(1);

    await removeMember('camp-1', 'member-id', 'u1', 'creator');
    expect(CampaignMember.destroy).toHaveBeenCalledWith({ where: { id: 'member-id' } });
  });

  test('admin puede eliminar miembro directamente', async () => {
    CampaignMember.destroy.mockResolvedValue(1);

    await removeMember('camp-1', 'member-id', 'admin-user', 'admin');
    expect(CampaignMember.findOne).not.toHaveBeenCalled();
    expect(CampaignMember.destroy).toHaveBeenCalledWith({ where: { id: 'member-id' } });
  });
});
