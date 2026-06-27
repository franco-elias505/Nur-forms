const campaignModel = require('../models/Campaign.js');
const userModel = require('../models/User.js');
const campaignMemberModel = require('../models/CampaignMember.js');
const formModel = require('../models/Form.js');
const { Op } = require('sequelize');

async function getAllCampaigns(){
    try {
        const result = await campaignModel.findAll({
            include: [{ model: userModel, as: 'creator', attributes: ['id', 'full_name', 'email'] }]
        });
        return result;

    } catch (error) {
        throw error;
    }
}

async function getAllUserCampaigns(userId){
    try {
        const result = await campaignModel.findAll({where:{created_by: userId}});
        return result;
    } catch (error) {
        throw error;
    }
}

async function getAsMemberCampaigns(memberId){
    try {
        const result = await campaignModel.findAll({
            where: {
                created_by: { [Op.ne]: memberId }
            },
            include: [{
                model: campaignMemberModel, as: 'members',
                where: { user_id: memberId }
            }]
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function createCampaign(campaignData, ownerId){
    console.log(`supuesto usuario owner: ${ownerId}`);
    try {
        const result = await campaignModel.create({...campaignData, created_by: ownerId});
        return result;
    } catch (error) {
        throw error;
    }
}

async function getCampaignDetails(id){
    try {
        const result = await campaignModel.findByPk(id,{include: [
            { model: userModel, as: 'creator', attributes: ['id', 'full_name', 'email'] },
            { model: formModel, as: 'forms', attributes: ['id', 'title', 'status', 'access_type', 'created_at'] },
            { model: campaignMemberModel, as: 'members', include: [{ model: userModel, as: 'user', attributes: ['id', 'full_name', 'email'] }] }
        ]});
        return result;
    } catch (error) {
        throw error;
    }
}

async function getCampaignById(id){
    try {
        const result = await campaignModel.findByPk(id);
        return result;
    } catch (error) {
        throw error;
    }
}

async function updateCampaignState(id, newState){
    try {
        const result = await campaignModel.update({status: newState}, {returning: true, where:{id : id}});
        return result[0]; //[ rowsUpdate, [updatedInstanceModel]]
        
    } catch (error) {
        throw error;
    }
}

async function deleteCampaign(id){
    try {
        const result = await campaignModel.destroy({where: {id: id}})
        return result; //cantidad de filas afectadas tras la operacion (tipo de dato number/int)
    } catch (error) {
        throw error
    }
}
module.exports = {
    getAllUserCampaigns,
    createCampaign,
    getAllCampaigns,
    getAsMemberCampaigns,
    getAllCampaigns,
    getCampaignDetails,
    getCampaignById,
    updateCampaignState,
    deleteCampaign
}