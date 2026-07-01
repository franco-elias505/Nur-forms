describe('Users Page Flow', () => {
  beforeEach(() => {
    // Mock de la sesión/autenticación para actuar como administrador
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: { id: 1, email: 'admin@nur.edu.bo', role: 'admin', name: 'Admin', is_active: true }
    }).as('meRequest')

    
    window.localStorage.setItem('token', 'fake-admin-token')
  })

  it('should list users and allow role change', () => {
    const mockUsers = [
      { id: 2, full_name: 'Usuario Prueba', email: 'prueba@nur.edu.bo', role: 'creator', is_active: true }
    ]

  
    cy.intercept('GET', '/api/users', {
      statusCode: 200,
      body: mockUsers
    }).as('getUsers')

  
    cy.intercept('GET', '**/api/users/search*', {
      statusCode: 200,
      body: mockUsers
    }).as('searchUser')

    cy.intercept('PATCH', '/api/users/2/role', {
      statusCode: 200,
      body: { ...mockUsers[0], role: 'admin' }
    }).as('changeRole')

    cy.visit('http://localhost:5173/users')

  
    cy.wait('@getUsers')

   
    cy.contains('h1', 'Usuarios').should('be.visible')
    cy.contains('Usuario Prueba').should('be.visible')

    cy.get('input#searchUserEmail').type('prueba@nur.edu.bo')
    cy.get('button#searchUserBtn').click()

    cy.wait('@searchUser')

    // Abrir el modal de roles para el usuario encontrado
    cy.get('button#roleBtn-2').first().click()

    // Verificar el contenido del modal
    cy.contains('Cambiar rol').should('be.visible')
    cy.get('select#roleSelect').select('admin')

    // Guardar nuevo rol
    cy.get('button#saveRoleBtn').click()
    cy.wait('@changeRole')

    // Verificar que el rol se actualizó visualmente (la etiqueta debe decir Administrador)
    cy.contains('.badge--admin', 'Administrador').should('be.visible')
  })
})
