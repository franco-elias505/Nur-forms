jest.mock('../../src/models/Campaign.js');
jest.mock('../../src/models/User.js');
jest.mock('../../src/models/CampaignMember.js');
jest.mock('../../src/models/Form.js');

const campaignModel = require('../../src/models/Campaign.js');
const userModel = require('../../src/models/User.js');
const campaignMemberModel = require('../../src/models/CampaignMember.js');
const formModel = require('../../src/models/Form.js');
const campaignRepo = require('../../src/repositories/campaign-repository.js');

const mockCampaign = { id: 'camp-1', name: 'Test', status: 'draft', created_by: 'user-1' };

beforeEach(() => jest.clearAllMocks());

describe('getAllCampaigns', () => {
  test('retorna campañas con creator incluido', async () => {
    campaignModel.findAll.mockResolvedValue([mockCampaign]);
    const result = await campaignRepo.getAllCampaigns();
    expect(campaignModel.findAll).toHaveBeenCalledWith({
      include: [{ model: userModel, as: 'creator', attributes: ['id', 'full_name', 'email'] }]
    });
    expect(result).toEqual([mockCampaign]);
  });
});

describe('getAllUserCampaigns', () => {
  test('filtra por created_by', async () => {
    campaignModel.findAll.mockResolvedValue([mockCampaign]);
    const result = await campaignRepo.getAllUserCampaigns('user-1');
    expect(campaignModel.findAll).toHaveBeenCalledWith({ where: { created_by: 'user-1' } });
    expect(result).toEqual([mockCampaign]);
  });
});

describe('getAsMemberCampaigns', () => {
  test('incluye filtro por miembro', async () => {
    campaignModel.findAll.mockResolvedValue([mockCampaign]);
    const result = await campaignRepo.getAsMemberCampaigns('user-2');
    expect(campaignModel.findAll).toHaveBeenCalledWith({
      include: [{ model: campaignMemberModel, as: 'members', where: { user_id: 'user-2' } }]
    });
    expect(result).toEqual([mockCampaign]);
  });
});

describe('createCampaign', () => {
  test('crea campaña con ownerId', async () => {
    campaignModel.create.mockResolvedValue(mockCampaign);
    const data = { name: 'Nueva', description: 'Desc' };
    const result = await campaignRepo.createCampaign(data, 'user-1');
    expect(campaignModel.create).toHaveBeenCalledWith({ ...data, created_by: 'user-1' });
    expect(result).toEqual(mockCampaign);
  });
});

describe('getCampaignDetails', () => {
  test('retorna campaña con includes', async () => {
    campaignModel.findByPk.mockResolvedValue(mockCampaign);
    const result = await campaignRepo.getCampaignDetails('camp-1');
    expect(campaignModel.findByPk).toHaveBeenCalledWith('camp-1', {
      include: expect.arrayContaining([
        expect.objectContaining({ model: userModel, as: 'creator' }),
        expect.objectContaining({ model: formModel, as: 'forms' }),
        expect.objectContaining({ model: campaignMemberModel, as: 'members' })
      ])
    });
    expect(result).toEqual(mockCampaign);
  });
});

describe('getCampaignById', () => {
  test('delega a findByPk', async () => {
    campaignModel.findByPk.mockResolvedValue(mockCampaign);
    const result = await campaignRepo.getCampaignById('camp-1');
    expect(campaignModel.findByPk).toHaveBeenCalledWith('camp-1');
    expect(result).toEqual(mockCampaign);
  });
});

describe('updateCampaignState', () => {
  test('retorna filas actualizadas', async () => {
    campaignModel.update.mockResolvedValue([1, [mockCampaign]]);
    const result = await campaignRepo.updateCampaignState('camp-1', 'active');
    expect(campaignModel.update).toHaveBeenCalledWith(
      { status: 'active' },
      { returning: true, where: { id: 'camp-1' } }
    );
    expect(result).toBe(1);
  });
});

describe('deleteCampaign', () => {
  test('retorna filas eliminadas', async () => {
    campaignModel.destroy.mockResolvedValue(1);
    const result = await campaignRepo.deleteCampaign('camp-1');
    expect(campaignModel.destroy).toHaveBeenCalledWith({ where: { id: 'camp-1' } });
    expect(result).toBe(1);
  });
});
