jest.mock('../../src/models/User.js');
jest.mock('../../src/models/Campaign.js');
jest.mock('../../src/models/Submission.js');

const userModel = require('../../src/models/User.js');
const campaignModel = require('../../src/models/Campaign.js');
const submissionModel = require('../../src/models/Submission.js');
const userRepo = require('../../src/repositories/user.repository.js');

const mockUser = {
  id: 1,
  email: 'user@nur.edu.bo',
  full_name: 'Ana López',
  role: 'creator',
  is_active: true
};

beforeEach(() => jest.clearAllMocks());

describe('getAllUsers', () => {
  test('delega a userModel.findAll con atributos correctos', async () => {
    userModel.findAll.mockResolvedValue([mockUser]);
    const result = await userRepo.getAllUsers();
    expect(userModel.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'email', 'full_name', 'role', 'is_active', 'created_at']
    });
    expect(result).toEqual([mockUser]);
  });
});

describe('getUserById', () => {
  test('delega a userModel.findByPk', async () => {
    userModel.findByPk.mockResolvedValue(mockUser);
    const result = await userRepo.getUserById(1);
    expect(userModel.findByPk).toHaveBeenCalledWith(1, {
      attributes: ['id', 'email', 'full_name', 'role', 'is_active', 'created_at']
    });
    expect(result).toEqual(mockUser);
  });
});

describe('getUserByEmail', () => {
  test('delega a userModel.findOne', async () => {
    userModel.findOne.mockResolvedValue(mockUser);
    const result = await userRepo.getUserByEmail('user@nur.edu.bo');
    expect(userModel.findOne).toHaveBeenCalledWith({ where: { email: 'user@nur.edu.bo' } });
    expect(result).toEqual(mockUser);
  });
});

describe('updateUserById', () => {
  test('retorna la instancia actualizada', async () => {
    userModel.update.mockResolvedValue([1, [mockUser]]);
    const result = await userRepo.updateUserById(1, { role: 'admin' });
    expect(userModel.update).toHaveBeenCalledWith(
      { role: 'admin' },
      { returning: true, where: { id: 1 } }
    );
    expect(result).toEqual(mockUser);
  });
});

describe('createUser', () => {
  test('delega a userModel.create', async () => {
    userModel.create.mockResolvedValue(mockUser);
    const data = { email: 'a@nur.edu.bo', password_hash: 'hash', full_name: 'A', role: 'creator' };
    const result = await userRepo.createUser(data);
    expect(userModel.create).toHaveBeenCalledWith(data);
    expect(result).toEqual(mockUser);
  });
});

describe('countUserCampaigns', () => {
  test('retorna el conteo de campañas del usuario', async () => {
    campaignModel.count.mockResolvedValue(3);
    const result = await userRepo.countUserCampaigns(1);
    expect(campaignModel.count).toHaveBeenCalledWith({ where: { created_by: 1 } });
    expect(result).toBe(3);
  });

  test('propaga errores del modelo', async () => {
    campaignModel.count.mockRejectedValue(new Error('DB error'));
    await expect(userRepo.countUserCampaigns(1)).rejects.toThrow('DB error');
  });
});

describe('countUserSubmissions', () => {
  test('retorna el conteo de submissions del usuario', async () => {
    submissionModel.count.mockResolvedValue(2);
    const result = await userRepo.countUserSubmissions(1);
    expect(submissionModel.count).toHaveBeenCalledWith({ where: { user_id: 1 } });
    expect(result).toBe(2);
  });

  test('propaga errores del modelo', async () => {
    submissionModel.count.mockRejectedValue(new Error('DB error'));
    await expect(userRepo.countUserSubmissions(1)).rejects.toThrow('DB error');
  });
});

describe('deleteUser', () => {
  test('retorna filas eliminadas', async () => {
    userModel.destroy.mockResolvedValue(1);
    const result = await userRepo.deleteUser(1);
    expect(userModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toBe(1);
  });

  test('propaga errores del modelo', async () => {
    userModel.destroy.mockRejectedValue(new Error('DB error'));
    await expect(userRepo.deleteUser(1)).rejects.toThrow('DB error');
  });
});
