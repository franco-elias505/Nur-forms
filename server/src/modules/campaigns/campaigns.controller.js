const {getAllService, getByIdService, createService, updateService, removeService, duplicate, addMember, removeMember} = require('./campaigns.service')

const getAll = async (req, res, next) => {
  
  try {
    const campaigns = await getAllService(req.user.role, req.user.id);
    res.status(200).json({campaigns: campaigns});
  } catch (error) {
    return next(error);
  }
}


const getById = async (req, res, next) => {
  try {
    const campaignDetails = await getByIdService(req.params.id, req.user.id, req.user.role)
    res.status(200).json({campaignDetails});
  } catch (error) {

    if(error.message === 'No tiene acceso a esta campaña'){
      return res.status(403).json({message: error.message});
    }
    if(error.message === 'Campaña inexistente'){
      return res.status(400).json({message: error.message});
    }
    return next(error);
  }
}

const create = async (req, res) => {
  try {
    const result = await createService(req.body, req.user.id)
    console.log(`Campaha creada exitosamente: ${req.body.name}, owner es: ${req.user.email}`);
    return res.status(201).json(result);
  } catch (error) { //aqui manejamos errores de mala entrada peeero no estamos manejando el caso de un error interno en el server
    return res.status(400).json({ message: error.message });
  }
}

const update = async (req, res, next) => {
  try {
    const campaign = await updateService(req.params.id, req.body, req.user.id, req.user.role)
    return res.status(200).json(campaign)
  } catch (error) {
    if(error.message === 'No se pudo actualizar el estado, intente nuevamente') return res.status(500).json({message: error.message});
    res.status(400).json({message: error.message});
  }
}


const remove = async (req, res, next) => {
  try {
   const result = await removeService(req.params.id, req.user.id, req.user.role)
   return res.status(204).json(result);

  } catch (error) {
    if(error.message === 'Error al eliminar la campaña intente nuevamente') return next(error);
    console.error(`Error capturado en el controller: ${error.message}`);
    res.status(400).json({ message: error.message })
  }
}

const duplicateController = async (req, res) => {
  try {
    const campaign = await duplicate(req.params.id, req.user.id)
    res.status(201).json(campaign)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const addMemberController = async (req, res) => {
  try {
    const member = await addMember(req.params.id, req.body, req.user.id, req.user.role)
    res.status(201).json(member)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const removeMemberController = async (req, res) => {
  try {
    await removeMember(req.params.id, req.params.memberId, req.user.id, req.user.role)
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = {getAll, getById, create, update, remove, duplicateController, addMemberController, removeMemberController }
