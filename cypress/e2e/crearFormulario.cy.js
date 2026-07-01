describe('Crear formulario', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 1,
          email: 'admin@nur.edu.bo',
          role: 'admin',
          name: 'Admin'
        }
      }
    }).as('me')

    cy.intercept('GET', '**/campaigns/1', {
      statusCode: 200,
      body: {
        id: 1,
        name: 'Campaña de prueba',
        description: 'Campaña para validar el flujo de formularios',
        status: 'draft',
        members: []
      }
    }).as('getCampaign')

    cy.intercept('GET', '**/forms/campaign/1', {
      statusCode: 200,
      body: []
    }).as('getForms')

    cy.visit('http://localhost:5173/campaigns/1', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'fake-token')
      }
    })
  })

  it('debe crear un formulario desde la vista de campaña', () => {
    cy.intercept('POST', '**/forms', (req) => {
      expect(req.body.title).to.eq('Encuesta de prueba')
      req.reply({
        statusCode: 201,
        body: {
          id: 42,
          title: 'Encuesta de prueba',
          description: '',
          campaign_id: 1,
          access_type: 'public',
          status: 'draft'
        }
      })
    }).as('createForm')

    cy.wait('@me')
    cy.wait('@getCampaign')
    cy.wait('@getForms')

    cy.contains('button', 'Nuevo formulario').click()
    cy.contains('Nuevo formulario').should('be.visible')

    cy.get('input[placeholder="Encuesta de satisfacción"]').type('Encuesta de prueba')
    cy.contains('button', 'Crear formulario').click()

    cy.wait('@createForm').its('response.statusCode').should('eq', 201)
    cy.contains('Encuesta de prueba').should('be.visible')
  })
})