describe('Validación del formulario', () => {
  const form = {
    id: 1,
    title: 'Formulario de validación',
    description: 'Formulario usado para validar campos obligatorios',
    welcome_message: 'Antes de responder, revisa las preguntas obligatorias.',
    thank_you_message: 'Gracias por completar la validación.',
    primary_color: '#1d4ed8',
    show_progress_bar: true,
    paginate_sections: false,
    shuffle_questions: false,
    questions: [
      {
        id: 101,
        type: 'short_text',
        text: '¿Cuál es tu nombre?',
        is_required: true,
        config: { placeholder: 'Tu nombre completo' }
      },
      {
        id: 102,
        type: 'single_choice',
        text: 'Selecciona tu carrera',
        is_required: true,
        options: [
          { id: 201, text: 'Ingeniería de Sistemas' },
          { id: 202, text: 'Administración' }
        ]
      },
      {
        id: 103,
        type: 'multiple_choice',
        text: 'Elige tus áreas de interés',
        is_required: true,
        options: [
          { id: 301, text: 'Desarrollo web' },
          { id: 302, text: 'Base de datos' }
        ]
      }
    ]
  }

  beforeEach(() => {
    cy.intercept('GET', '/api/forms/public/1', {
      statusCode: 200,
      body: form
    }).as('getForm')

    cy.intercept('POST', '/api/submissions/form/1/start', {
      statusCode: 200,
      body: {
        id: 999,
        respondent_token: 'fake-respondent-token'
      }
    }).as('startSubmission')

    cy.intercept('PATCH', '/api/submissions/999/answers', (req) => {
      expect(req.body.respondentToken).to.eq('fake-respondent-token')
      expect(req.body.answers).to.deep.include({
        question_id: 101,
        text_value: 'Juan Perez',
        boolean_value: null,
        selected_option_ids: [],
        matching_pairs: []
      })
      expect(req.body.answers).to.deep.include({
        question_id: 102,
        text_value: null,
        boolean_value: null,
        selected_option_ids: [201],
        matching_pairs: []
      })
      expect(req.body.answers).to.deep.include({
        question_id: 103,
        text_value: null,
        boolean_value: null,
        selected_option_ids: [301],
        matching_pairs: []
      })

      req.reply({
        statusCode: 200,
        body: {}
      })
    }).as('saveAnswers')

    cy.intercept('PATCH', '/api/submissions/999/submit', {
      statusCode: 200,
      body: {}
    }).as('submitForm')

    cy.visit('http://localhost:5173/responder/1')
    cy.wait('@getForm')
    cy.contains('button', 'Comenzar encuesta').click()
    cy.wait('@startSubmission')
  })

  it('no debe enviar respuestas si los campos obligatorios están vacíos', () => {
    cy.get('button#submitAnswersBtn').click()

    cy.contains('Este campo es obligatorio').should('be.visible')
    cy.contains('Selecciona una opción').should('be.visible')
    cy.contains('Selecciona al menos una opción').should('be.visible')

    cy.get('@saveAnswers.all').should('have.length', 0)
    cy.get('@submitForm.all').should('have.length', 0)
  })

  it('debe limpiar los errores y enviar cuando se completan los campos obligatorios', () => {
    cy.get('button#submitAnswersBtn').click()

    cy.get('input#shortText-101').type('Juan Perez')
    cy.get('input#radio-102-201').check()
    cy.get('input#checkbox-103-301').check()

    cy.contains('Este campo es obligatorio').should('not.exist')
    cy.contains('Selecciona una opción').should('not.exist')
    cy.contains('Selecciona al menos una opción').should('not.exist')

    cy.get('button#submitAnswersBtn').click()

    cy.wait('@saveAnswers').its('response.statusCode').should('eq', 200)
    cy.wait('@submitForm').its('response.statusCode').should('eq', 200)
    cy.contains('¡Respuestas enviadas!').should('be.visible')
    cy.contains('Gracias por completar la validación.').should('be.visible')
  })
})
