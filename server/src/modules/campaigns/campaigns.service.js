const { Campaign, CampaignMember, User, Form } = require('../../models')

const {
  getAllCampaigns,
  getAllUserCampaigns,
  getAsMemberCampaigns,
  getCampaignDetails,
  getCampaignById,
  createCampaign,
  updateCampaignState,
  deleteCampaign
} = require('../../repositories/campaign-repository.js');

const {getMembership, insertMember} = require('../../repositories/campaign-member.repository.js');

const getAllService = async (role, userId) => {

  if(role === 'admin'){
    try {
      const result = await getAllCampaigns();
      return result;

    } catch (error) {
      throw error;
    }
  }

  if(role === 'creator'){
    try {
      const [ownCampaigns, memberCampaigns] = await Promise.all([
        getAllUserCampaigns(userId),
        getAsMemberCampaigns(userId)
      ]);
      // Combinar ambas listas en un solo array
      const allCampaigns = [...ownCampaigns, ...memberCampaigns];
      return allCampaigns;

    } catch (error) {
      throw error
    }
  }
}

const getByIdService = async (campaignId, userId, userRole) => {
    try {
      const campaignExist = await getCampaignById(campaignId);

      if(!campaignExist) throw new Error('Campaña inexistente');

      if(userRole === 'creator'){

        const isOwner = campaignExist.created_by === userId;
        const membership = await getMembership(campaignId, userId);

        if(!isOwner && !membership) throw new Error('No tiene acceso a esta campaña');
      }

      const detailsResult = await getCampaignDetails(campaignId);
      return detailsResult;

    } catch (error) {
      throw error;
    }
}

const createService = async (campaignData, ownerId) => {

   // const { name, description, starts_at, ends_at } = req.body;
  
   if(campaignData.name.trim() == ''){
    throw new Error('Nombre de campaha es obligatorio');
   }

   if(campaignData.starts_at && campaignData.ends_at){

        const currentTime = new Date();
        currentTime.setHours(0,0,0,0);

        const startCampaign = new Date(campaignData.starts_at + 'T00:00:00')
        const endCampaign = new Date(campaignData.ends_at + 'T00:00:00')

        if(isNaN(startCampaign.getTime()) || isNaN(endCampaign.getTime())){
            throw new Error('Formato de fecha invalido');
        }

        if(startCampaign < currentTime) throw new Error('Fecha de inicio no puede ser pasada a fecha actual');
        if(endCampaign < currentTime) throw new Error('La fecha de finalizacion no puede ser pasada a la fecha actual');
        if(endCampaign < startCampaign) throw new Error('La fecha de finalizacion no puede ser pasada a la fecha de inicio');

    }else{
        campaignData.starts_at = null;
        campaignData.ends_at = null;
    }

    try {
        const result = await createCampaign({
            name: campaignData.name,
            description: campaignData.description?? 'Sin descripcion',
            starts_at: campaignData.starts_at,
            ends_at: campaignData.ends_at
        }, ownerId);

        await insertMember(result.id, ownerId, 'owner');
        return {
            message: 'Campaha creada exitosamente'
        }

    } catch (error) {
        throw error;
    }
}

const updateService = async (id, data, userId, userRole) => {
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) throw new Error('Campana inexistente');
 
    if (campaign.status === 'archived') throw new Error('Esta campana no se puede editar');
 
    const { name, description, starts_at, ends_at, status: newState } = data;
 
    // --- Cambio de estado (opcional) ---
    if (newState !== undefined && newState !== campaign.status) {
      const validTransitions = {
        draft:    ['active', 'closed'],
        active:   ['draft', 'closed'],
        closed:   ['archived'],
        archived: []
      };
      const validValues = ['active', 'closed', 'archived', 'draft'];
      if (!validValues.includes(newState)) throw new Error('Estado invalido');
 
      const isValidTransition = validTransitions[campaign.status].includes(newState);
      if (!isValidTransition) throw new Error('Transicion de estado no permitida');
 
      const rows = await updateCampaignState(id, newState);
      if (rows === 0) throw new Error('No se pudo actualizar el estado, intente nuevamente');
    }
 
    // --- Actualizacion de metadatos (opcional) ---
    const metaUpdates = {};
 
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') throw new Error('El nombre es obligatorio');
      metaUpdates.name = name.trim();
    }
 
    if (description !== undefined) {
      metaUpdates.description = description ?? '';
    }
 
    if (starts_at !== undefined || ends_at !== undefined) {
      const resolvedStart = starts_at || null;
      const resolvedEnd   = ends_at   || null;
 
      if (resolvedStart && resolvedEnd) {
        const startDate = new Date(resolvedStart + 'T00:00:00');
        const endDate   = new Date(resolvedEnd   + 'T00:00:00');
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error('Formato de fecha invalido');
        if (endDate < startDate) throw new Error('La fecha de finalizacion no puede ser anterior a la de inicio');
      }
 
      metaUpdates.starts_at = resolvedStart;
      metaUpdates.ends_at   = resolvedEnd;
    }
 
    if (Object.keys(metaUpdates).length > 0) {
      await campaign.update(metaUpdates);
    }
 
    return { message: 'Campana actualizada con exito' };
 
  } catch (error) {
    throw error;
  }
}

const removeService = async (id, userId, userRole) => {
  try {
    console.log(userId);
    const existResult = await getCampaignById(id);
    if(!existResult){
      throw new Error('Campaña no encontrada');
    }

    const currentStatus = existResult.status;
    if(currentStatus !== 'closed' && currentStatus !== 'archived' && currentStatus !== 'draft'){
      throw new Error('Estado de campaña invalido para eliminacion, cambie el estado para poder proceder');
    }

    const userMembership = await getMembership(id, userId);
    if(!userMembership){
      throw new Error('No forma parte de esta campaña');
    }
    if(userMembership.role !== 'owner'){
      throw new Error('No tiene los permisos para eliminar esta campaña');
    }

    const result = await deleteCampaign(id);
    if(result === 0){
      throw new Error ('Error al eliminar la campaña intente nuevamente');
    }

    return{
      message: 'Campaña eliminada exitosamente'
    }

  } catch (error) {
    throw error;
  }
}

const duplicate = async (id, userId) => {
  const original = await Campaign.findByPk(id, { include: [{ model: Form, as: 'forms' }] })
  if (!original) throw new Error('Campaña no encontrada')

  const copy = await Campaign.create({
    name: `${original.name} (copia)`,
    description: original.description,
    status: 'draft',
    created_by: userId
  })
  await CampaignMember.create({ campaign_id: copy.id, user_id: userId, role: 'owner' })
  return copy
}

const addMember = async (campaignId, { user_id, role }, requesterId, requesterRole) => {
  const campaign = await Campaign.findByPk(campaignId)
  if (!campaign) throw new Error('Campaña no encontrada')

  if (requesterRole !== 'admin') {
    const member = await CampaignMember.findOne({ where: { campaign_id: campaignId, user_id: requesterId, role: 'owner' } })
    if (!member) throw new Error('Solo el dueño puede agregar miembros')
  }

  const existing = await CampaignMember.findOne({ where: { campaign_id: campaignId, user_id } })
  if (existing) throw new Error('El usuario ya es miembro de esta campaña')

  return CampaignMember.create({ campaign_id: campaignId, user_id, role: role || 'viewer' })
}

const removeMember = async (campaignId, memberId, requesterId, requesterRole) => {
  if (requesterRole !== 'admin') {
    const member = await CampaignMember.findOne({ where: { campaign_id: campaignId, user_id: requesterId, role: 'owner' } })
    if (!member) throw new Error('Solo el dueño puede eliminar miembros')
  }
  await CampaignMember.destroy({ where: { id: memberId } })
}

module.exports = { getAllService, getByIdService, createService, updateService, removeService, duplicate, addMember, removeMember}