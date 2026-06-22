// Mock manual de todos los modelos Sequelize
// Jest usa este archivo cuando se llama jest.mock('../../src/models')

const makeModel = (name) => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  _modelName: name
});

const User                = makeModel('User');
const Campaign            = makeModel('Campaign');
const CampaignMember      = makeModel('CampaignMember');
const Form                = makeModel('Form');
const Section             = makeModel('Section');
const Question            = makeModel('Question');
const Option              = makeModel('Option');
const Invitation          = makeModel('Invitation');
const Submission          = makeModel('Submission');
const Answer              = makeModel('Answer');
const NotificationSetting = makeModel('NotificationSetting');

module.exports = {
  User,
  Campaign,
  CampaignMember,
  Form,
  Section,
  Question,
  Option,
  Invitation,
  Submission,
  Answer,
  NotificationSetting
};
