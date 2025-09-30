describe('Smoke Tests - Critical Application Functionality', () => {
  // Smoke tests verify that the most critical parts of the application work
  // These should be fast, reliable tests that catch major breakages
  
  describe('Application Startup', () => {
    it('should load the application homepage', () => {
      cy.visit('/')
      
      // Measure page load performance
      cy.measurePageLoad(3000)
      
      // Basic page elements should be present
      cy.get('body').should('be.visible')
      cy.title().should('not.be.empty')
      
      // Should have navigation or login elements
      cy.get('[data-cy=login-button], [data-cy=navigation], [data-cy=header]').should('exist')
    })

    it('should have all critical API endpoints responding', () => {
      const criticalEndpoints = [
        { method: 'GET', url: '/users/auth/user/', requiresAuth: true },
        { method: 'GET', url: '/properties/', requiresAuth: false },
        { method: 'GET', url: '/contracts/', requiresAuth: true },
        { method: 'GET', url: '/messages/', requiresAuth: true },
      ]
      
      // Test public endpoints
      criticalEndpoints
        .filter(ep => !ep.requiresAuth)
        .forEach(endpoint => {
          cy.measureApiResponse(endpoint.method, endpoint.url, 2000).then(({ response, responseTime }) => {
            expect(response.status).to.be.oneOf([200, 401]) // 401 is acceptable for auth-required endpoints
            cy.log(`${endpoint.method} ${endpoint.url}: ${responseTime}ms`)
          })
        })
      
      // Test authenticated endpoints
      cy.quickLogin('landlord')
      
      criticalEndpoints
        .filter(ep => ep.requiresAuth)
        .forEach(endpoint => {
          cy.measureApiResponse(endpoint.method, endpoint.url, 2000).then(({ response, responseTime }) => {
            expect(response.status).to.be.oneOf([200, 201])
            cy.log(`${endpoint.method} ${endpoint.url}: ${responseTime}ms`)
          })
        })
    })

    it('should establish database connectivity', () => {
      // Verify database is accessible by making a simple API call
      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/properties/`,
        failOnStatusCode: false
      }).then((response) => {
        // Should get some response (200 for success, 401 for auth required)
        expect(response.status).to.be.oneOf([200, 401])
        expect(response.body).to.exist
      })
    })
  })

  describe('Authentication Critical Path', () => {
    it('should allow user login', () => {
      cy.visit('/login')
      
      // Login form should be present
      cy.get('[data-cy=email-input]').should('be.visible')
      cy.get('[data-cy=password-input]').should('be.visible')
      cy.get('[data-cy=login-button]').should('be.visible')
      
      // Should be able to login
      cy.loginAs('landlord')
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      
      // User should be authenticated
      cy.get('[data-cy=user-menu]').should('be.visible')
    })

    it('should maintain authentication state', () => {
      cy.loginAs('landlord')
      
      // Navigate to different pages
      const pages = ['/properties', '/contracts', '/messages']
      
      pages.forEach(page => {
        cy.visit(page)
        cy.get('[data-cy=user-menu]').should('be.visible') // Still authenticated
        cy.url().should('not.include', '/login') // Not redirected to login
      })
    })

    it('should handle logout', () => {
      cy.loginAs('landlord')
      
      // Logout
      cy.get('[data-cy=user-menu]').click()
      cy.get('[data-cy=logout-button]').click()
      
      // Should redirect to login
      cy.url().should('include', '/login')
      
      // Should clear authentication
      cy.window().its('localStorage').invoke('getItem', 'access_token').should('be.null')
    })
  })

  describe('Core Functionality', () => {
    beforeEach(() => {
      cy.loginAs('landlord')
    })

    it('should display property list', () => {
      cy.visit('/properties')
      
      // Page should load
      cy.get('[data-cy=property-list], [data-cy=empty-state]').should('be.visible')
      
      // Should have search functionality
      cy.get('[data-cy=search-input]').should('be.visible')
      
      // Should have add property option for landlords
      cy.get('[data-cy=add-property-button]').should('be.visible')
    })

    it('should display contract list', () => {
      cy.visit('/contracts')
      
      // Page should load
      cy.get('[data-cy=contract-list], [data-cy=empty-state]').should('be.visible')
      
      // Should have new contract option for landlords
      cy.get('[data-cy=new-contract-button]').should('be.visible')
    })

    it('should display messages interface', () => {
      cy.visit('/messages')
      
      // Page should load
      cy.get('[data-cy=message-interface]').should('be.visible')
      
      // Should have basic messaging elements
      cy.get('[data-cy=conversation-list], [data-cy=new-message-button]').should('exist')
    })

    it('should display user dashboard', () => {
      cy.visit('/dashboard')
      
      // Dashboard should load with key metrics
      cy.get('[data-cy=dashboard]').should('be.visible')
      
      // Should show user-specific information
      cy.get('[data-cy=user-stats], [data-cy=recent-activity]').should('exist')
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      cy.loginAs('landlord')
    })

    it('should have functional navigation menu', () => {
      cy.visit('/dashboard')
      
      // Main navigation should be present
      cy.get('[data-cy=navigation], [data-cy=nav-menu]').should('be.visible')
      
      // Key navigation items should be present
      const navItems = ['dashboard', 'properties', 'contracts', 'messages']
      
      navItems.forEach(item => {
        cy.get(`[data-cy=nav-${item}]`).should('be.visible')
      })
    })

    it('should navigate between main sections', () => {
      const sections = [
        { path: '/dashboard', element: '[data-cy=dashboard]' },
        { path: '/properties', element: '[data-cy=property-list], [data-cy=empty-state]' },
        { path: '/contracts', element: '[data-cy=contract-list], [data-cy=empty-state]' },
        { path: '/messages', element: '[data-cy=message-interface]' }
      ]
      
      sections.forEach(section => {
        cy.visit(section.path)
        cy.get(section.element).should('be.visible')
        cy.url().should('include', section.path)
      })
    })
  })

  describe('WebSocket Connectivity', () => {
    beforeEach(() => {
      // Only run WebSocket tests if enabled
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) {
        cy.log('WebSocket tests disabled, skipping...')
        return
      }
      
      cy.loginAs('landlord')
    })

    it('should establish WebSocket connections', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      const websocketEndpoints = [
        '/messaging/',
        '/notifications/',
        '/user-status/'
      ]
      
      websocketEndpoints.forEach(endpoint => {
        cy.task('testWebSocketConnection', {
          url: `${Cypress.env('WS_URL')}${endpoint}`,
          timeout: 5000
        }).then((result) => {
          expect(result.success).to.be.true
          cy.log(`✅ WebSocket ${endpoint} connection successful`)
        })
      })
    })

    it('should show WebSocket status indicators', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      // Should have WebSocket status indicator
      cy.get('[data-cy=websocket-status]', { timeout: 10000 }).should('be.visible')
      
      // Should show connected status
      cy.get('[data-cy=websocket-status]').should('contain', 'Connected')
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', () => {
      cy.visit('/nonexistent-page', { failOnStatusCode: false })
      
      // Should show 404 page or redirect
      cy.get('[data-cy=not-found], [data-cy=error-page]').should('be.visible')
      
      // Should have way to navigate back
      cy.get('[data-cy=back-to-home], [data-cy=navigation]').should('be.visible')
    })

    it('should handle API errors gracefully', () => {
      cy.loginAs('landlord')
      
      // Make request to non-existent endpoint
      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/nonexistent/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404)
      })
      
      // Application should still be functional
      cy.visit('/dashboard')
      cy.get('[data-cy=dashboard]').should('be.visible')
    })

    it('should handle network errors gracefully', () => {
      cy.loginAs('landlord')
      cy.visit('/properties')
      
      // Simulate network error by intercepting API calls
      cy.intercept('GET', '**/api/v1/properties/', { forceNetworkError: true })
      
      // Reload page to trigger API call
      cy.reload()
      
      // Should show error state
      cy.get('[data-cy=error-message], [data-cy=network-error]', { timeout: 10000 })
        .should('be.visible')
      
      // Should have retry option
      cy.get('[data-cy=retry-button]').should('be.visible')
    })
  })

  describe('Performance Smoke Tests', () => {
    it('should load main pages within performance threshold', () => {
      const pages = [
        { path: '/', name: 'Homepage' },
        { path: '/login', name: 'Login' }
      ]
      
      pages.forEach(page => {
        cy.visit(page.path)
        cy.measurePageLoad(3000).then(loadTime => {
          cy.log(`${page.name} load time: ${loadTime.toFixed(2)}ms`)
          expect(loadTime).to.be.lessThan(3000)
        })
      })
    })

    it('should handle concurrent API requests', () => {
      cy.quickLogin('landlord')
      
      // Make multiple concurrent API requests
      const requests = [
        cy.apiRequest('GET', '/properties/'),
        cy.apiRequest('GET', '/contracts/'),
        cy.apiRequest('GET', '/messages/'),
        cy.apiRequest('GET', '/users/profile/')
      ]
      
      // All requests should complete successfully
      Cypress.Promise.all(requests).then(responses => {
        responses.forEach((response, index) => {
          expect(response.status).to.be.oneOf([200, 201])
          cy.log(`Concurrent request ${index + 1}: ${response.status}`)
        })
      })
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent data across different views', () => {
      cy.loginAs('landlord')
      
      // Create a test property
      cy.createTestProperty({
        title: 'Consistency Test Property'
      }).then(property => {
        // Check property appears in list view
        cy.visit('/properties')
        cy.get('[data-cy=property-list]').should('contain', property.title)
        
        // Check property details are consistent
        cy.get('[data-cy=property-card]').contains(property.title).click()
        cy.get('[data-cy=property-title]').should('contain', property.title)
        cy.get('[data-cy=property-price]').should('contain', property.rent_price.toLocaleString())
      })
    })
  })

  describe('Security Smoke Tests', () => {
    it('should protect authenticated routes', () => {
      // Clear any existing authentication
      cy.clearLocalStorage()
      cy.clearCookies()
      
      const protectedRoutes = ['/dashboard', '/properties', '/contracts', '/messages']
      
      protectedRoutes.forEach(route => {
        cy.visit(route)
        // Should redirect to login or show login form
        cy.url().should('match', /\/(login|auth)/)
      })
    })

    it('should handle invalid authentication tokens', () => {
      // Set invalid token
      cy.window().then(win => {
        win.localStorage.setItem('access_token', 'invalid_token')
      })
      
      cy.visit('/dashboard')
      
      // Should redirect to login or show authentication error
      cy.url({ timeout: 10000 }).should('match', /\/(login|auth)/)
    })
  })

  // Summary test that runs all critical checks quickly
  describe('Critical Path Integration', () => {
    it('should complete full user journey', () => {
      // 1. Load application
      cy.visit('/')
      cy.get('body').should('be.visible')
      
      // 2. Login
      cy.loginAs('landlord')
      cy.url().should('include', '/dashboard')
      
      // 3. Navigate to properties
      cy.visit('/properties')
      cy.get('[data-cy=property-list], [data-cy=empty-state]').should('be.visible')
      
      // 4. Check contracts
      cy.visit('/contracts')
      cy.get('[data-cy=contract-list], [data-cy=empty-state]').should('be.visible')
      
      // 5. Check messages
      cy.visit('/messages')
      cy.get('[data-cy=message-interface]').should('be.visible')
      
      // 6. Return to dashboard
      cy.visit('/dashboard')
      cy.get('[data-cy=dashboard]').should('be.visible')
      
      // 7. Logout
      cy.get('[data-cy=user-menu]').click()
      cy.get('[data-cy=logout-button]').click()
      cy.url().should('include', '/login')
      
      cy.log('✅ Critical user journey completed successfully')
    })
  })
})