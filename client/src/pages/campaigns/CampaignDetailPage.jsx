import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { campaignsApi, formsApi, usersApi, invitationsApi } from '../../api/services'
import { Modal, Confirm, StatusBadge, EmptyState, Loading, Alert } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import './CampaignDetail.css'

const EMPTY_FORM = {
  title: '', description: '', access_type: 'public', anonymous_mode: false,
  shuffle_questions: false, show_progress_bar: true, paginate_sections: false,
  max_responses_per_user: 1, welcome_message: '', thank_you_message: '',
  primary_color: '#1d4ed8'
}

function InvitationsPanel({ form }) {
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invitationsApi.getByForm(form.id)
      setInvitations(res.data)
    } catch {} finally { setLoading(false) }
  }, [form.id])

  useEffect(() => { load() }, [load])

  const inviteLink = (token) =>
    `${window.location.origin}/responder/${form.id}?token=${token}`

  const handleSend = async () => {
    const emails = emailInput.split(',').map(e => e.trim()).filter(Boolean)
    if (!emails.length) return
    setSending(true); setResults([])
    try {
      const res = await invitationsApi.create(form.id, { emails })
      setResults(res.data)
      setEmailInput('')
      load()
    } catch {} finally { setSending(false) }
  }

  const handleRemove = async (id) => {
    try { await invitationsApi.remove(id); load() } catch {}
  }

  const statusLabel = {
    pending: '⏳ Pendiente',
    opened: '👁 Abierta',
    submitted: '✅ Respondida',
    expired: '❌ Expirada'
  }

  return (
    <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
        🔒 Invitaciones — {invitations.length} enviadas
      </p>

      {/* Enviar invitaciones */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          type="text"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="email@nur.edu.bo, otro@nur.edu.bo"
          style={{ flex: 1, fontSize: 12, height: 30, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)' }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSend}
          disabled={sending || !emailInput.trim()}
        >
          {sending ? '...' : 'Invitar'}
        </button>
      </div>

      {/* Resultados del envío */}
      {results.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {results.map((r, i) => (
            <p key={i} style={{ fontSize: 11, color: r.status === 'sent' ? 'var(--success)' : 'var(--warning)' }}>
              {r.email} — {r.status === 'sent' ? '✅ Enviado' : r.status === 'already_invited' ? '⚠ Ya invitado' : '⚠ Email falló'}
              {r.token && (
                <span
                  style={{ marginLeft: 8, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigator.clipboard.writeText(inviteLink(r.token))}
                >
                  Copiar link
                </span>
              )}
            </p>
          ))}
        </div>
      )}

      {/* Lista de invitaciones */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : invitations.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin invitaciones aún.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {invitations.map(inv => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ flex: 1, color: 'var(--text-h)' }}>{inv.email}</span>
              <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{statusLabel[inv.status] || inv.status}</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => navigator.clipboard.writeText(inviteLink(inv.token))}
              >
                Copiar link
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => handleRemove(inv.id)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export default function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [campaign, setCampaign] = useState(null)
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('forms')

  const [formModal, setFormModal] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [memberModal, setMemberModal] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'viewer' })
  const [memberSaving, setMemberSaving] = useState(false)

  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [camRes, formsRes] = await Promise.all([
        campaignsApi.getById(id),
        formsApi.getByCampaign(id)
      ])
      setCampaign(camRes.data)
      setForms(formsRes.data)
    } catch { navigate('/campaigns') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const openCreateForm = () => {
    setEditingForm(null); setFormData(EMPTY_FORM); setFormError(''); setFormModal(true)
  }
  const openEditForm = (f) => {
    setEditingForm(f)
    setFormData({
      title: f.title, description: f.description || '',
      access_type: f.access_type, anonymous_mode: f.anonymous_mode,
      shuffle_questions: f.shuffle_questions, show_progress_bar: f.show_progress_bar,
      paginate_sections: f.paginate_sections, max_responses_per_user: f.max_responses_per_user,
      welcome_message: f.welcome_message || '', thank_you_message: f.thank_you_message || '',
      primary_color: f.primary_color || '#1d4ed8',
      opens_at: f.opens_at ? f.opens_at.slice(0, 16) : '',
      closes_at: f.closes_at ? f.closes_at.slice(0, 16) : '',
    })
    setFormError(''); setFormModal(true)
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) { setFormError('El título es requerido'); return }
    setSaving(true); setFormError('')
    try {
      if (editingForm) {
        await formsApi.update(editingForm.id, formData)
      } else {
        await formsApi.create({ ...formData, campaign_id: id })
      }
      setFormModal(false); load()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleDeleteForm = async () => {
    setDeleting(true)
    try { await formsApi.remove(confirmDelete.id); setConfirmDelete(null); load() }
    catch {} finally { setDeleting(false) }
  }

  const handlePublish = async (f) => {
    try { await formsApi.publish(f.id); load() } catch {}
  }
  const handleClose = async (f) => {
    try { await formsApi.close(f.id); load() } catch {}
  }
  const handleDuplicateForm = async (f) => {
    try { await formsApi.duplicate(f.id); load() } catch {}
  }

  const openMemberModal = async () => {
    if (user?.role === 'admin') {
      const res = await usersApi.getAll()
      setAllUsers(res.data.filter(u => u.id !== user.id))
    }
    setMemberForm({ user_id: '', role: 'viewer' })
    setMemberModal(true)
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!memberForm.user_id) return
    setMemberSaving(true)
    try {
      await campaignsApi.addMember(id, memberForm)
      setMemberModal(false); load()
    } catch {} finally { setMemberSaving(false) }
  }

  const handleRemoveMember = async () => {
    try {
      await campaignsApi.removeMember(id, confirmRemoveMember.id)
      setConfirmRemoveMember(null); load()
    } catch {}
  }

  const shareUrl = (formId) => `${window.location.origin}/responder/${formId}` //2do bug aqui no estaba especificada la ruta a la pagina que renderiza la pagina RespondPage

  if (loading) return <Loading full />
  if (!campaign) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
        <Link to="/campaigns" style={{ color: 'var(--text-muted)' }}>Campañas</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-h)', fontWeight: 500 }}>{campaign.name}</span>
      </div>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.description && <p className="text-muted" style={{ marginTop: 4 }}>{campaign.description}</p>}
        </div>
        <div className="page-actions">
          {tab === 'forms' && (
            <button className="btn btn-primary" onClick={openCreateForm}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Nuevo formulario
            </button>
          )}
          {tab === 'members' && user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={openMemberModal}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Agregar miembro
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'forms' ? 'tab--active' : ''}`} onClick={() => setTab('forms')}>
          Formularios ({forms.length})
        </button>
        <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>
          Miembros ({campaign.members?.length || 0})
        </button>
      </div>

      {/* Forms tab */}
      {tab === 'forms' && (
        forms.length === 0 ? (
          <EmptyState
            title="Sin formularios"
            description="Crea el primer formulario de esta campaña."
            action={<button className="btn btn-primary" onClick={openCreateForm}>Crear formulario</button>}
          />
        ) : (
          <div className="forms-list">
            {forms.map(f => (
              <div key={f.id} className="form-row">
                <div className="form-row__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="form-row__title">{f.title}</span>
                    <StatusBadge status={f.status} />
                    <span className={`badge badge--${f.access_type === 'public' ? 'published' : 'draft'}`}>
                      {f.access_type === 'public' ? '🌐 Público' : '🔒 Privado'}
                    </span>
                  </div>
                  {f.description && <p className="text-sm text-muted">{f.description}</p>}
                  {f.status === 'published' && f.access_type === 'public' && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
    <input
      type="text"
      readOnly
      value={shareUrl(f.id)}
      style={{ fontSize: 11, height: 26, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 4, padding: '0 6px', width: 340, cursor: 'text', color: 'var(--text-muted)' }}
      onClick={e => e.target.select()}
    />
    <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(shareUrl(f.id))}>
      Copiar
    </button>
  </div>
)}
{f.status === 'published' && f.access_type === 'private' && (
  <InvitationsPanel form={f} />
)}
                </div>
                <div className="form-row__actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/campaigns/${id}/forms/${f.id}/edit`)}>
                    Constructor
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/forms/${f.id}/reports`)}>
                    Reportes
                  </button>
                  {f.status === 'draft' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handlePublish(f)}>Publicar</button>
                  )}
                  {f.status === 'published' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleClose(f)}>Cerrar</button>
                  )}
                  <button className="btn btn-ghost btn-icon btn-sm" title="Editar config" onClick={() => openEditForm(f)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar" onClick={() => handleDuplicateForm(f)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Eliminar" onClick={() => setConfirmDelete(f)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div className="card">
          {(!campaign.members || campaign.members.length === 0) ? (
            <EmptyState title="Sin miembros" description="Agrega colaboradores a esta campaña." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr>
                </thead>
                <tbody>
                  {campaign.members.map(m => (
                    <tr key={m.id}>
                      <td>{m.user?.full_name}</td>
                      <td className="text-muted">{m.user?.email}</td>
                      <td><span className="badge badge--draft">{m.role}</span></td>
                      <td>
                        {user?.role === 'admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmRemoveMember(m)}>Quitar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      <Modal open={formModal} onClose={() => setFormModal(false)} title={editingForm ? 'Editar formulario' : 'Nuevo formulario'} size="lg">
        <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && <Alert type="error">{formError}</Alert>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Título *</label>
              <input type="text" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Encuesta de satisfacción" required />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción</label>
              <textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="field">
              <label>Acceso</label>
              <select value={formData.access_type} onChange={e => setFormData(f => ({ ...f, access_type: e.target.value }))}>
                <option value="public">Público (enlace)</option>
                <option value="private">Privado (invitados)</option>
              </select>
            </div>
            <div className="field">
              <label>Respuestas por usuario</label>
              <input type="number" min={0} value={formData.max_responses_per_user} onChange={e => setFormData(f => ({ ...f, max_responses_per_user: +e.target.value }))} />
              <span className="hint">0 = sin límite</span>
            </div>
            <div className="field">
              <label>Apertura</label>
              <input type="datetime-local" value={formData.opens_at || ''} onChange={e => setFormData(f => ({ ...f, opens_at: e.target.value }))} />
            </div>
            <div className="field">
              <label>Cierre</label>
              <input type="datetime-local" value={formData.closes_at || ''} onChange={e => setFormData(f => ({ ...f, closes_at: e.target.value }))} />
            </div>
            <div className="field">
              <label>Color primario</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={formData.primary_color} onChange={e => setFormData(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 38, height: 38, padding: 2, cursor: 'pointer' }} />
                <input type="text" value={formData.primary_color} onChange={e => setFormData(f => ({ ...f, primary_color: e.target.value }))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="field" style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['anonymous_mode', 'Modo anónimo'],
                  ['shuffle_questions', 'Barajar preguntas'],
                  ['show_progress_bar', 'Barra de progreso'],
                  ['paginate_sections', 'Paginación por secciones'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 400 }}>
                    <input type="checkbox" checked={formData[key]} onChange={e => setFormData(f => ({ ...f, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Mensaje de bienvenida</label>
              <textarea value={formData.welcome_message} onChange={e => setFormData(f => ({ ...f, welcome_message: e.target.value }))} rows={2} />
            </div>
            <div className="field">
              <label>Mensaje de agradecimiento</label>
              <textarea value={formData.thank_you_message} onChange={e => setFormData(f => ({ ...f, thank_you_message: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn-secondary" onClick={() => setFormModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {editingForm ? 'Guardar' : 'Crear formulario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add member modal */}
      <Modal open={memberModal} onClose={() => setMemberModal(false)} title="Agregar miembro">
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Usuario</label>
            <select value={memberForm.user_id} onChange={e => setMemberForm(f => ({ ...f, user_id: e.target.value }))} required>
              <option value="">Seleccionar usuario...</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Rol en la campaña</label>
            <select value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}>
              <option value="owner">Dueño</option>
              <option value="editor">Editor</option>
              <option value="viewer">Lector</option>
            </select>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn-secondary" onClick={() => setMemberModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={memberSaving}>Agregar</button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteForm}
        loading={deleting}
        danger
        title="Eliminar formulario"
        message={`¿Eliminar "${confirmDelete?.title}"? Se perderán todas sus preguntas y respuestas.`}
      />

      <Confirm
        open={!!confirmRemoveMember}
        onClose={() => setConfirmRemoveMember(null)}
        onConfirm={handleRemoveMember}
        danger
        title="Quitar miembro"
        message={`¿Quitar a ${confirmRemoveMember?.user?.full_name} de la campaña?`}
      />
    </div>
  )
}
