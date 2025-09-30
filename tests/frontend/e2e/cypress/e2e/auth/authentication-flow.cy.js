describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('User Registration', () => {
    it('should allow new user registration', () => {
      const testEmail = `test${Date.now()}@verihome.com`
      
      cy.visit('/register')
      
      // Fill registration form
      cy.get('[data-cy=first-name-input]').type('Test')
      cy.get('[data-cy=last-name-input]').type('User')
      cy.get('[data-cy=email-input]').type(testEmail)
      cy.get('[data-cy=password-input]').type('testpassword123')
      cy.get('[data-cy=password2-input]').type('testpassword123')
      cy.get('[data-cy=user-type-select]').select('tenant')
      
      // Submit registration
      cy.get('[data-cy=register-button]').click()
      
      // Should redirect to email verification
      cy.url().should('include', '/email-verification')
      cy.get('[data-cy=email-verification-message]').should('be.visible')
      cy.get('[data-cy=email-verification-message]').should('contain', testEmail)
    })

    it('should show validation errors for invalid data', () => {
      cy.visit('/register')
      
      // Try to submit empty form
      cy.get('[data-cy=register-button]').click()
      
      // Should show validation errors
      cy.get('[data-cy=email-error]').should('be.visible')
      cy.get('[data-cy=password-error]').should('be.visible')
      cy.get('[data-cy=first-name-error]').should('be.visible')
      
      // Test password mismatch
      cy.get('[data-cy=password-input]').type('password123')
      cy.get('[data-cy=password2-input]').type('differentpassword')
      cy.get('[data-cy=register-button]').click()
      
      cy.get('[data-cy=password2-error]').should('contain', 'Passwords must match')
    })

    it('should prevent registration with existing email', () => {
      cy.visit('/register')
      
      // Try to register with existing email
      cy.get('[data-cy=email-input]').type('landlord@test.com')
      cy.get('[data-cy=password-input]').type('testpassword123')
      cy.get('[data-cy=password2-input]').type('testpassword123')
      cy.get('[data-cy=first-name-input]').type('Test')
      cy.get('[data-cy=last-name-input]').type('User')
      cy.get('[data-cy=user-type-select]').select('tenant')
      
      cy.get('[data-cy=register-button]').click()
      
      // Should show error message
      cy.get('[data-cy=registration-error]')
        .should('be.visible')
        .and('contain', 'email already exists')
    })
  })

  describe('User Login', () => {
    it('should allow login with valid credentials', () => {
      cy.visit('/login')
      
      // Fill login form
      cy.get('[data-cy=email-input]').type('landlord@test.com')
      cy.get('[data-cy=password-input]').type('test123')
      
      // Measure login performance
      cy.measurePageLoad(3000)
      
      // Submit login
      cy.get('[data-cy=login-button]').click()
      
      // Should redirect to dashboard
      cy.url().should('not.include', '/login')
      cy.url().should('include', '/dashboard')
      
      // Should show user info
      cy.get('[data-cy=user-menu]').should('be.visible')
      cy.get('[data-cy=dashboard]').should('be.visible')
      
      // Verify auth token is stored
      cy.window().its('localStorage')
        .invoke('getItem', 'access_token')
        .should('exist')
    })

    it('should show error for invalid credentials', () => {
      cy.visit('/login')
      
      // Try login with invalid credentials
      cy.get('[data-cy=email-input]').type('invalid@test.com')
      cy.get('[data-cy=password-input]').type('wrongpassword')
      cy.get('[data-cy=login-button]').click()
      
      // Should show error message
      cy.get('[data-cy=login-error]')
        .should('be.visible')
        .and('contain', 'Invalid credentials')
      
      // Should stay on login page
      cy.url().should('include', '/login')
    })

    it('should show validation errors for empty fields', () => {
      cy.visit('/login')
      
      // Try to submit empty form
      cy.get('[data-cy=login-button]').click()
      
      // Should show validation errors
      cy.get('[data-cy=email-error]').should('be.visible')
      cy.get('[data-cy=password-error]').should('be.visible')
    })

    it('should handle different user types correctly', () => {
      const userTypes = ['landlord', 'tenant', 'service']
      
      userTypes.forEach(userType => {
        cy.clearLocalStorage()
        cy.clearCookies()
        
        cy.loginAs(userType)
        
        // Verify redirect based on user type
        cy.url().should('include', '/dashboard')
        
        // Verify user-specific UI elements
        if (userType === 'landlord') {
          cy.get('[data-cy=add-property-button]').should('be.visible')
        } else if (userType === 'tenant') {
          cy.get('[data-cy=search-properties-button]').should('be.visible')
        }
        
        // Logout
        cy.get('[data-cy=user-menu]').click()
        cy.get('[data-cy=logout-button]').click()
        cy.url().should('include', '/login')
      })
    })
  })

  describe('Password Reset', () => {
    it('should allow password reset request', () => {
      cy.visit('/login')
      
      // Click forgot password
      cy.get('[data-cy=forgot-password-link]').click()
      cy.url().should('include', '/forgot-password')
      
      // Enter email
      cy.get('[data-cy=email-input]').type('landlord@test.com')
      cy.get('[data-cy=reset-password-button]').click()
      
      // Should show success message
      cy.get('[data-cy=reset-success-message]')
        .should('be.visible')
        .and('contain', 'Password reset email sent')
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      cy.loginAs('landlord')
    })

    it('should maintain session across page reloads', () => {
      cy.visit('/dashboard')
      cy.get('[data-cy=dashboard]').should('be.visible')
      
      // Reload page
      cy.reload()
      
      // Should still be logged in
      cy.get('[data-cy=dashboard]').should('be.visible')
      cy.get('[data-cy=user-menu]').should('be.visible')
    })

    it('should logout user when session expires', () => {
      // Mock expired token
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'expired_token')
      })
      
      // Make API request that should fail
      cy.visit('/properties')
      
      // Should redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login')
      cy.get('[data-cy=session-expired-message]').should('be.visible')
    })

    it('should logout user manually', () => {
      cy.get('[data-cy=user-menu]').click()
      cy.get('[data-cy=logout-button]').click()
      
      // Should redirect to login
      cy.url().should('include', '/login')
      
      // Should clear auth tokens
      cy.window().its('localStorage')
        .invoke('getItem', 'access_token')
        .should('be.null')
    })
  })

  describe('Protected Routes', () => {
    it('should redirect to login for protected routes when not authenticated', () => {
      const protectedRoutes = ['/dashboard', '/properties', '/contracts', '/messages', '/profile']
      
      protectedRoutes.forEach(route => {
        cy.visit(route)
        cy.url().should('include', '/login')
      })
    })

    it('should allow access to protected routes when authenticated', () => {
      cy.loginAs('landlord')
      
      const protectedRoutes = ['/dashboard', '/properties', '/contracts', '/messages', '/profile']
      
      protectedRoutes.forEach(route => {
        cy.visit(route)
        cy.url().should('include', route)
        cy.get('[data-cy=loading-spinner]').should('not.exist')
      })
    })
  })

  describe('Role-Based Access', () => {
    it('should show different navigation for different user types', () => {
      // Test landlord navigation
      cy.loginAs('landlord')
      cy.get('[data-cy=nav-properties]').should('be.visible')
      cy.get('[data-cy=nav-contracts]').should('be.visible')
      cy.get('[data-cy=add-property-button]').should('be.visible')
      
      // Logout and test tenant navigation
      cy.get('[data-cy=user-menu]').click()
      cy.get('[data-cy=logout-button]').click()
      
      cy.loginAs('tenant')
      cy.get('[data-cy=nav-search]').should('be.visible')
      cy.get('[data-cy=nav-favorites]').should('be.visible')
      cy.get('[data-cy=add-property-button]').should('not.exist')
    })
  })
})