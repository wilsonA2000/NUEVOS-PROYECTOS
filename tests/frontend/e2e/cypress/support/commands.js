// Custom commands for VeriHome E2E testing

// Authentication Commands
Cypress.Commands.add('quickLogin', (userType = 'landlord') => {
  const credentials = {
    landlord: { email: 'landlord@test.com', password: 'test123' },
    tenant: { email: 'tenant@test.com', password: 'test123' },
    service: { email: 'service@test.com', password: 'test123' }
  }
  
  const cred = credentials[userType]
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/users/auth/login/`,
    body: {
      email: cred.email,
      password: cred.password
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    const { access, refresh } = response.body
    
    window.localStorage.setItem('access_token', access)
    window.localStorage.setItem('refresh_token', refresh)
    
    cy.wrap(access).as('authToken')
  })
})

// Property Management Commands
Cypress.Commands.add('createTestProperty', (propertyData = {}) => {
  const defaultProperty = {
    title: `Test Property ${Date.now()}`,
    description: 'Test property created by Cypress',
    address: 'Calle Test 123',
    city: 'Medellín',
    property_type: 'apartment',
    rent_price: 1000000,
    bedrooms: 2,
    bathrooms: 1,
    area: 80,
    is_active: true,
    ...propertyData
  }
  
  return cy.apiRequest('POST', '/properties/', { body: defaultProperty })
    .then((response) => {
      expect(response.status).to.eq(201)
      cy.wrap(response.body).as('testProperty')
      return response.body
    })
})

// Contract Management Commands  
Cypress.Commands.add('createTestContract', (contractData = {}) => {
  return cy.get('@testProperty').then((property) => {
    const defaultContract = {
      title: `Test Contract ${Date.now()}`,
      description: 'Test contract created by Cypress',
      contract_type: 'rental_urban',
      property: property.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthly_rent: property.rent_price,
      ...contractData
    }
    
    return cy.apiRequest('POST', '/contracts/', { body: defaultContract })
      .then((response) => {
        expect(response.status).to.eq(201)
        cy.wrap(response.body).as('testContract')
        return response.body
      })
  })
})

// WebSocket Commands
Cypress.Commands.add('establishWebSocketConnection', (endpoint, options = {}) => {
  const { timeout = 5000, authenticate = true } = options
  
  return cy.window().then((win) => {
    return new Cypress.Promise((resolve, reject) => {
      let wsUrl = `${Cypress.env('WS_URL')}${endpoint}`
      
      // Add auth token to WebSocket URL if needed
      if (authenticate) {
        cy.get('@authToken').then((token) => {
          wsUrl += `?token=${token}`
        })
      }
      
      const ws = new win.WebSocket(wsUrl)
      
      // Store connection for cleanup
      if (!win.websocketConnections) {
        win.websocketConnections = []
      }
      win.websocketConnections.push(ws)
      
      const timer = setTimeout(() => {
        ws.close()
        reject(new Error(`WebSocket connection failed: timeout after ${timeout}ms`))
      }, timeout)
      
      ws.onopen = () => {
        clearTimeout(timer)
        cy.log(`✅ WebSocket connected to ${endpoint}`)
        resolve(ws)
      }
      
      ws.onerror = (error) => {
        clearTimeout(timer)
        cy.log(`❌ WebSocket error on ${endpoint}:`, error)
        reject(error)
      }
    })
  })
})

// Message Testing Commands
Cypress.Commands.add('sendWebSocketMessage', (ws, message) => {
  return new Cypress.Promise((resolve) => {
    const messageData = typeof message === 'string' ? message : JSON.stringify(message)
    
    ws.send(messageData)
    cy.log(`📤 Sent WebSocket message: ${messageData}`)
    
    // Wait for any response
    ws.onmessage = (event) => {
      cy.log(`📥 Received WebSocket message: ${event.data}`)
      resolve(event.data)
    }
    
    // Resolve after a short delay if no response expected
    setTimeout(() => resolve(null), 1000)
  })
})

// UI Testing Commands
Cypress.Commands.add('navigateToPage', (pageName) => {
  const routes = {
    dashboard: '/dashboard',
    properties: '/properties',
    'property-form': '/properties/new',
    contracts: '/contracts',
    messages: '/messages',
    profile: '/profile',
    settings: '/settings'
  }
  
  const route = routes[pageName]
  if (!route) {
    throw new Error(`Unknown page: ${pageName}`)
  }
  
  cy.visit(route)
  cy.url().should('include', route)
})

// Form Testing Commands
Cypress.Commands.add('fillPropertyForm', (propertyData) => {
  const data = {
    title: 'Test Property',
    description: 'Test Description',
    address: 'Test Address',
    city: 'Medellín',
    rent_price: '1000000',
    bedrooms: '2',
    bathrooms: '1',
    area: '80',
    ...propertyData
  }
  
  Object.keys(data).forEach(field => {
    cy.get(`[data-cy=${field}-input]`).clear().type(data[field])
  })
  
  // Handle property type selection
  if (data.property_type) {
    cy.get('[data-cy=property-type-select]').click()
    cy.get(`[data-value=${data.property_type}]`).click()
  }
})

// File Upload Commands
Cypress.Commands.add('uploadPropertyImages', (imageCount = 3) => {
  for (let i = 1; i <= imageCount; i++) {
    cy.get('[data-cy=image-upload]').selectFile({
      contents: Cypress.Buffer.from(`fake-image-${i}`),
      fileName: `test-image-${i}.jpg`,
      mimeType: 'image/jpeg'
    }, { action: 'select' })
  }
  
  // Wait for upload completion
  cy.get('[data-cy=upload-progress]', { timeout: 10000 }).should('not.exist')
})

// Notification Commands
Cypress.Commands.add('waitForNotification', (expectedText, timeout = 5000) => {
  cy.get('[data-cy=notification]', { timeout })
    .should('be.visible')
    .and('contain', expectedText)
})

// Performance Testing Commands
Cypress.Commands.add('measureApiResponse', (method, url, expectedMaxTime = 2000) => {
  const startTime = Date.now()
  
  return cy.apiRequest(method, url).then((response) => {
    const responseTime = Date.now() - startTime
    cy.log(`API Response time: ${responseTime}ms`)
    
    if (responseTime > expectedMaxTime) {
      cy.log(`⚠️ API response time (${responseTime}ms) exceeds threshold (${expectedMaxTime}ms)`)
    }
    
    return { response, responseTime }
  })
})

// Search and Filter Commands
Cypress.Commands.add('searchProperties', (searchTerm) => {
  cy.get('[data-cy=search-input]').clear().type(search)
  cy.get('[data-cy=search-button]').click()
  
  // Wait for search results
  cy.get('[data-cy=property-list]').should('be.visible')
  cy.get('[data-cy=loading-spinner]').should('not.exist')
})

Cypress.Commands.add('applyPropertyFilters', (filters) => {
  // Open filters panel
  cy.get('[data-cy=filters-button]').click()
  cy.get('[data-cy=filters-panel]').should('be.visible')
  
  // Apply each filter
  Object.keys(filters).forEach(filterKey => {
    const filterValue = filters[filterKey]
    
    if (filterKey === 'price_range') {
      cy.get('[data-cy=price-min-input]').clear().type(filterValue.min)
      cy.get('[data-cy=price-max-input]').clear().type(filterValue.max)
    } else if (filterKey === 'bedrooms' || filterKey === 'bathrooms') {
      cy.get(`[data-cy=${filterKey}-select]`).select(filterValue.toString())
    } else if (filterKey === 'property_type') {
      cy.get(`[data-cy=filter-${filterValue}]`).check()
    } else if (filterKey === 'city') {
      cy.get('[data-cy=city-input]').clear().type(filterValue)
    }
  })
  
  // Apply filters
  cy.get('[data-cy=apply-filters-button]').click()
  
  // Wait for filtered results
  cy.get('[data-cy=loading-spinner]').should('not.exist')
})

// Chat and Messaging Commands
Cypress.Commands.add('sendChatMessage', (message) => {
  cy.get('[data-cy=message-input]').clear().type(message)
  cy.get('[data-cy=send-message-button]').click()
  
  // Verify message appears in chat
  cy.get('[data-cy=message-list]')
    .should('contain', message)
})

Cypress.Commands.add('waitForIncomingMessage', (expectedMessage, timeout = 10000) => {
  cy.get('[data-cy=message-list]', { timeout })
    .should('contain', expectedMessage)
})

// Utility Commands
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-cy=loading-spinner]', { timeout: 10000 }).should('not.exist')
  cy.get('body').should('be.visible')
})

Cypress.Commands.add('checkAccessibility', () => {
  // Basic accessibility checks
  cy.get('h1').should('exist') // Page should have a main heading
  cy.get('[alt=""]').should('not.exist') // Images should have alt text
  cy.get('button').should('not.be.disabled') // Buttons should be accessible
})

// Cleanup Commands
Cypress.Commands.add('cleanupTestData', () => {
  // Delete test properties
  cy.apiRequest('GET', '/properties/').then((response) => {
    if (response.body && response.body.results) {
      response.body.results
        .filter(prop => prop.title.includes('Test Property'))
        .forEach(prop => {
          cy.apiRequest('DELETE', `/properties/${prop.id}/`)
        })
    }
  })
  
  // Delete test contracts
  cy.apiRequest('GET', '/contracts/').then((response) => {
    if (response.body && response.body.results) {
      response.body.results
        .filter(contract => contract.title.includes('Test Contract'))
        .forEach(contract => {
          cy.apiRequest('DELETE', `/contracts/${contract.id}/`)
        })
    }
  })
})