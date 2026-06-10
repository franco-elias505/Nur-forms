const { Invitation, Form, CampaignMember } = require('../../models')
const { sendInvitation } = require('../../utils/mailer')

const checkAccess = async (formId, userId, userRole) => {
  const form = await Form.findByPk(formId)
  if (!form) throw new Error('Formulario no encontrado')
  if (userRole === 'admin') return form

  const member = await CampaignMember.findOne({
    where: { campaign_id: form.campaign_id, user_id: userId, role: ['owner', 'editor'] }
  })
  if (!member) throw new Error('No tenés permisos sobre este formulario')
  return form
}

const getByForm = async (formId, userId, userRole) => {
  await checkAccess(formId, userId, userRole)
  return Invitation.findAll({ where: { form_id: formId }, order: [['created_at', 'DESC']] })
}

const create = async (formId, emails, userId, userRole, baseUrl) => {
  const form = await checkAccess(formId, userId, userRole)
  const results = []

  for (const email of emails) {
    const existing = await Invitation.findOne({ where: { form_id: formId, email } })
    if (existing) { results.push({ email, status: 'already_invited' }); continue }

    const invitation = await Invitation.create({ form_id: formId, email })
    const invitationLink = `${baseUrl}/responder/${formId}?token=${invitation.token}`

    try {
      await sendInvitation({ to: email, formTitle: form.title, invitationLink })
      await invitation.update({ sent_at: new Date() })
      results.push({ email, status: 'sent' })
    } catch (err) {
      results.push({ email, status: 'email_failed', token: invitation.token })
    }
  }
  return results
}

const remove = async (id, userId, userRole) => {
  const invitation = await Invitation.findByPk(id)
  if (!invitation) throw new Error('Invitación no encontrada')
  await checkAccess(invitation.form_id, userId, userRole)
  await invitation.destroy()
}

const validate = async (formId, token) => {
  const invitation = await Invitation.findOne({ where: { form_id: formId, token } })
  if (!invitation) throw new Error('Token inválido')
  if (invitation.status === 'submitted') throw new Error('Esta invitación ya fue usada')
  if (invitation.expires_at && new Date() > invitation.expires_at) {
    await invitation.update({ status: 'expired' })
    throw new Error('Esta invitación expiró')
  }
  return { valid: true, email: invitation.email }
}

module.exports = { getByForm, create, remove, validate }
