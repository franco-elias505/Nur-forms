const campaignMemberModel = require('../models/CampaignMember.js');

async function getMembership(campaignId, userId){
    return await campaignMemberModel.findOne({
        where: {campaign_id: campaignId, user_id: userId}
    });
}

async function insertMember(campaignId, memberId, role){
    return await campaignMemberModel.create({campaign_id: campaignId,user_id: memberId, role: role})
}
module.exports = {
    getMembership,
    insertMember
}