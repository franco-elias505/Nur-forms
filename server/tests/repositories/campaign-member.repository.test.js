jest.mock('../../src/models/CampaignMember.js');

const campaignMemberModel = require('../../src/models/CampaignMember.js');
const campaignMemberRepo = require('../../src/repositories/campaign-member.repository.js');

const mockMembership = { campaign_id: 'camp-1', user_id: 'user-1', role: 'owner' };

beforeEach(() => jest.clearAllMocks());

describe('getMembership', () => {
  test('busca membresía por campaignId y userId', async () => {
    campaignMemberModel.findOne.mockResolvedValue(mockMembership);
    const result = await campaignMemberRepo.getMembership('camp-1', 'user-1');
    expect(campaignMemberModel.findOne).toHaveBeenCalledWith({
      where: { campaign_id: 'camp-1', user_id: 'user-1' }
    });
    expect(result).toEqual(mockMembership);
  });

  test('retorna null si no hay membresía', async () => {
    campaignMemberModel.findOne.mockResolvedValue(null);
    const result = await campaignMemberRepo.getMembership('camp-1', 'user-99');
    expect(result).toBeNull();
  });
});

describe('insertMember', () => {
  test('crea un miembro con rol', async () => {
    campaignMemberModel.create.mockResolvedValue(mockMembership);
    const result = await campaignMemberRepo.insertMember('camp-1', 'user-2', 'editor');
    expect(campaignMemberModel.create).toHaveBeenCalledWith({
      campaign_id: 'camp-1',
      user_id: 'user-2',
      role: 'editor'
    });
    expect(result).toEqual(mockMembership);
  });
});
