import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom' //bug 1 de frontend no estabamos importando el hook searchParams
import { formsApi, submissionsApi } from '../../api/services'
import { Loading, Alert } from '../../components/ui'
import logo from '../../assets/nur_logo.png'
import './Respond.css'

export default function RespondPage() {
  const { formId } = useParams()
  
  const [searchParams] = useSearchParams()
  const invitationToken = searchParams.get('token') || null

  const [form, setForm] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState('welcome') // welcome | answering | submitted | error
  const [submission, setSubmission] = useState(null)
  const [respondentToken, setRespondentToken] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    formsApi.getPublic(formId)
      .then(r => {
        const f = r.data
        setForm(f)
        let qs = [...(f.questions || [])]
        if (f.shuffle_questions) qs = qs.sort(() => Math.random() - 0.5)
        setQuestions(qs)
        if (!f.welcome_message) setStep('answering')
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Formulario no disponible')
        setStep('error')
      })
      .finally(() => setLoading(false))
  }, [formId])

  const startSubmission = async () => {
    try {
      const res = await submissionsApi.start(formId, { invitationToken })
      setSubmission(res.data)
      setRespondentToken(res.data.respondent_token)
      setStep('answering')
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar')
    }
  }

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setValidationErrors(prev => { const n = { ...prev }; delete n[questionId]; return n })
  }

  const validate = (qs) => {
    const errs = {}
    for (const q of qs) {
      if (!q.is_required) continue
      const ans = answers[q.id]
      if (q.type === 'short_text' || q.type === 'long_text') {
        if (!ans?.text_value?.trim()) errs[q.id] = 'Este campo es obligatorio'
      } else if (q.type === 'true_false') {
        if (ans?.boolean_value === undefined || ans?.boolean_value === null) errs[q.id] = 'Selecciona una opción'
      } else if (q.type === 'single_choice') {
        if (!ans?.selected_option_ids?.length) errs[q.id] = 'Selecciona una opción'
      } else if (q.type === 'multiple_choice') {
        if (!ans?.selected_option_ids?.length) errs[q.id] = 'Selecciona al menos una opción'
      } else if (q.type === 'matching') {
        if (!ans?.matching_pairs?.length) errs[q.id] = 'Completa todos los pares'
      }
    }
    return errs
  }

  const paginatedQuestions = form?.paginate_sections
    ? [questions] // simple: all in one page for now; could split by sections
    : [questions]

  const currentPageQuestions = paginatedQuestions[currentPage] || []

  const buildAnswersPayload = () => {
    return questions.map(q => {
      const ans = answers[q.id] || {}
      return {
        question_id: q.id,
        text_value: ans.text_value || null,
        boolean_value: ans.boolean_value !== undefined ? ans.boolean_value : null,
        selected_option_ids: ans.selected_option_ids || [],
        matching_pairs: ans.matching_pairs || [],
      }
    })
  }

  const handleSubmit = async () => {
    const errs = validate(questions)
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      // scroll to first error
      const firstErrId = Object.keys(errs)[0]
      document.getElementById(`q-${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      let subId = submission?.id
      let rToken = respondentToken

      if (!subId) {
        const res = await submissionsApi.start(formId, {invitationToken})
        subId = res.data.id
        rToken = res.data.respondent_token
      }

      await submissionsApi.saveAnswers(subId, buildAnswersPayload(), rToken)
      await submissionsApi.submit(subId, rToken)
      setStep('submitted')
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar')
    } finally { setSubmitting(false) }
  }

  const progress = questions.length > 0
    ? Math.round((Object.keys(answers).length / questions.length) * 100)
    : 0

  const primaryColor = form?.primary_color || '#1d4ed8'

  if (loading) return <Loading full />

  return (
    <div className="respond-page">
      <div className="respond-form" style={{ '--primary': primaryColor }}>

        {/* Header con logo */}
        <div className="respond-form__header">
          <img src={logo} alt="NUR" className="respond-form__logo" />
          <div className="respond-form__brand">
            <span className="respond-form__brand-name">FormsNUR</span>
          </div>
        </div>

        {/* Error state */}
        {step === 'error' && (
          <div className="respond-state">
            <div className="respond-state__icon respond-state__icon--error">✕</div>
            <h2>Formulario no disponible</h2>
            <p>{error}</p>
          </div>
        )}

        {/* Welcome */}
        {step === 'welcome' && form && (
          <div className="respond-state">
            <h1 style={{ fontSize: 26, marginBottom: 6, color: '#0F6CBF' }}>{form.title}</h1>
            {form.description && <p style={{ color: '#6B7280', marginBottom: 16, fontSize: 15 }}>{form.description}</p>}
            {form.welcome_message && (
              <div className="respond-welcome-msg">{form.welcome_message}</div>
            )}
            <button
              className="btn btn-lg"
              style={{ marginTop: 24, background: primaryColor, color: '#fff', border: 'none', width: '100%' }}
              onClick={startSubmission}
            >
              Comenzar encuesta
            </button>
          </div>
        )}

        {/* Answering */}
        {step === 'answering' && form && (
          <>
            <div className="respond-form__top">
              <h2>{form.title}</h2>
              {form.show_progress_bar && (
                <div className="respond-progress">
                  <div className="respond-progress__bar" style={{ width: `${progress}%`, background: primaryColor }} />
                </div>
              )}
            </div>

            <div className="respond-questions">
              {currentPageQuestions.map((q, idx) => (
                <QuestionResponder
                  key={q.id}
                  question={q}
                  index={idx + 1}
                  answer={answers[q.id]}
                  onChange={(val) => handleAnswer(q.id, val)}
                  error={validationErrors[q.id]}
                  primaryColor={primaryColor}
                />
              ))}
            </div>

            {error && <Alert type="error">{error}</Alert>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                className="btn btn-lg"
                style={{ background: primaryColor, color: '#fff', border: 'none', minWidth: 160 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} /> : null}
                {submitting ? 'Enviando...' : 'Enviar respuestas'}
              </button>
            </div>
          </>
        )}

        {/* Submitted */}
        {step === 'submitted' && (
          <div className="respond-state">
            <div className="respond-state__icon respond-state__icon--success" style={{ background: `${primaryColor}20`, color: primaryColor }}>✓</div>
            <h2>¡Respuestas enviadas!</h2>
            <p>{form?.thank_you_message || 'Gracias por completar la encuesta. Tu respuesta ha sido registrada.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionResponder({ question: q, index, answer = {}, onChange, error, primaryColor }) {
  const handleSingleChoice = (optId) => {
    onChange({ selected_option_ids: [optId] })
  }

  const handleMultipleChoice = (optId, checked) => {
    const current = answer.selected_option_ids || []
    const updated = checked ? [...current, optId] : current.filter(id => id !== optId)
    onChange({ selected_option_ids: updated })
  }

  const handleMatchingPair = (pairIdx, selectedAnswer) => {
    const pairs = [...(q.config?.pairs || [])].map((p, i) =>
      i === pairIdx ? { concept: p.concept, answer: selectedAnswer } : p
    )
    // store as [{left, right}] pairs
    const matchingPairs = (answer.matching_pairs || []).filter(mp => mp.concept !== (q.config?.pairs?.[pairIdx]?.concept))
    const concept = q.config?.pairs?.[pairIdx]?.concept
    onChange({ matching_pairs: [...matchingPairs, { concept, answer: selectedAnswer }] })
  }

  const getMatchingAnswer = (concept) => {
    return (answer.matching_pairs || []).find(p => p.concept === concept)?.answer || ''
  }

  const shuffledAnswers = q.config?.shuffle_options
    ? [...(q.config?.pairs || [])].map(p => p.answer).sort(() => Math.random() - 0.5)
    : (q.config?.pairs || []).map(p => p.answer)

  return (
    <div id={`q-${q.id}`} className={`respond-question${error ? ' respond-question--error' : ''}`}>
      <div className="respond-question__label">
        <span className="respond-question__num" style={{ background: `${primaryColor}20`, color: primaryColor }}>{index}</span>
        <span>{q.text}</span>
        {q.is_required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </div>
      {q.help_text && <p className="text-sm text-muted" style={{ marginBottom: 10 }}>{q.help_text}</p>}

      {/* Single choice */}
      {q.type === 'single_choice' && (
        <div className="respond-options">
          {(q.options || []).map(opt => (
            <label key={opt.id} className={`respond-option${answer.selected_option_ids?.includes(opt.id) ? ' respond-option--selected' : ''}`} style={answer.selected_option_ids?.includes(opt.id) ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}}>
              <input type="radio" name={q.id} checked={answer.selected_option_ids?.includes(opt.id) || false} onChange={() => handleSingleChoice(opt.id)} />
              {opt.text}
            </label>
          ))}
        </div>
      )}

      {/* Multiple choice */}
      {q.type === 'multiple_choice' && (
        <div className="respond-options">
          {(q.options || []).map(opt => (
            <label key={opt.id} className={`respond-option${answer.selected_option_ids?.includes(opt.id) ? ' respond-option--selected' : ''}`} style={answer.selected_option_ids?.includes(opt.id) ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}}>
              <input type="checkbox" checked={answer.selected_option_ids?.includes(opt.id) || false} onChange={e => handleMultipleChoice(opt.id, e.target.checked)} />
              {opt.text}
            </label>
          ))}
        </div>
      )}

      {/* True / False */}
      {q.type === 'true_false' && (
        <div className="respond-options respond-options--row">
          {[{ label: 'Verdadero', value: true }, { label: 'Falso', value: false }].map(opt => (
            <label key={String(opt.value)} className={`respond-option${answer.boolean_value === opt.value ? ' respond-option--selected' : ''}`} style={answer.boolean_value === opt.value ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}}>
              <input type="radio" name={q.id} checked={answer.boolean_value === opt.value} onChange={() => onChange({ boolean_value: opt.value })} />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {/* Short text */}
      {q.type === 'short_text' && (
        <input
          type="text"
          value={answer.text_value || ''}
          onChange={e => onChange({ text_value: e.target.value })}
          placeholder={q.config?.placeholder || 'Tu respuesta...'}
          maxLength={q.config?.max_chars || undefined}
        />
      )}

      {/* Long text */}
      {q.type === 'long_text' && (
        <textarea
          value={answer.text_value || ''}
          onChange={e => onChange({ text_value: e.target.value })}
          placeholder={q.config?.placeholder || 'Tu respuesta...'}
          rows={4}
          maxLength={q.config?.max_chars || undefined}
        />
      )}

      {/* Matching */}
      {q.type === 'matching' && (
        <div className="respond-matching">
          {(q.config?.pairs || []).map((pair, idx) => (
            <div key={idx} className="respond-matching__row">
              <div className="respond-matching__concept">{pair.concept}</div>
              <div className="respond-matching__arrow">→</div>
              <select
                value={getMatchingAnswer(pair.concept)}
                onChange={e => handleMatchingPair(idx, e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Seleccionar...</option>
                {shuffledAnswers.map((ans, i) => (
                  <option key={i} value={ans}>{ans}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  )
}
