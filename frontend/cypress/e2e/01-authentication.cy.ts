describe('Authentication Flow', () => {
  const testUser = Cypress.env('testUser');
  
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Landing Page', () => {
    it('should display landing page correctly', () => {
      cy.get('h1').should('contain', 'VeriHome');
      cy.get('[data-testid="hero-section"]').should('be.visible');
      cy.get('[data-testid="login-link"]').should('be.visible');
      cy.get('[data-testid="register-link"]').should('be.visible');
    });

    it('should navigate to login from landing page', () => {
      cy.get('[data-testid="login-link"]').click();
      cy.url().should('include', '/login');
    });

    it('should navigate to register from landing page', () => {
      cy.get('[data-testid="register-link"]').click();
      cy.url().should('include', '/register');
    });
  });

  describe('Login Process', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display login form correctly', () => {
      cy.get('h1, h2, h4').should('contain', 'Iniciar Sesión');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
      cy.get('a').contains('¿Olvidaste tu contraseña?').should('be.visible');
      cy.get('a').contains('¿No tienes una cuenta?').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.get('button[type="submit"]').click();
      
      // Check for HTML5 validation or custom error messages
      cy.get('input[name="email"]').then(($input) => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should show error for invalid credentials', () => {
      cy.intercept('POST', '**/auth/login/', {
        statusCode: 401,
        body: { detail: 'Invalid credentials' }
      }).as('loginFailed');

      cy.get('input[name="email"]').type('wrong@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginFailed');
      cy.get('[role="alert"]').should('contain', 'Credenciales inválidas');
    });

    it('should login successfully with valid credentials', () => {
      cy.intercept('POST', '**/auth/login/', {
        statusCode: 200,
        body: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token'
        }
      }).as('loginSuccess');

      cy.intercept('GET', '**/auth/me/', {
        statusCode: 200,
        body: testUser
      }).as('getUserSuccess');

      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      cy.wait('@loginSuccess');
      cy.wait('@getUserSuccess');

      // Should redirect to dashboard
      cy.url().should('include', '/app');
      cy.checkAuthState(true);
    });

    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '**/auth/login/', {
        forceNetworkError: true
      }).as('networkError');

      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      cy.wait('@networkError');
      cy.get('[role="alert"]').should('contain', 'conexión');
    });

    it('should redirect to protected page after login', () => {
      // Try to access protected route
      cy.visit('/app/properties');
      cy.url().should('eq', Cypress.config().baseUrl + '/');

      // Login and check redirect
      cy.login();
      cy.url().should('include', '/app');
    });
  });

  describe('Registration Process', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display registration form correctly', () => {
      cy.get('h1, h2, h4').should('contain', 'Registro');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('input[name="first_name"]').should('be.visible');
      cy.get('input[name="last_name"]').should('be.visible');
      cy.get('select[name="role"], input[name="role"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('button[type="submit"]').click();
      
      // Should show validation messages
      cy.get('input[name="email"]').then(($input) => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should register successfully', () => {
      cy.intercept('POST', '**/auth/register/', {
        statusCode: 201,
        body: { user_id: 1, message: 'User created successfully' }
      }).as('registerSuccess');

      const newUser = {
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        role: 'tenant'
      };

      cy.get('input[name="email"]').type(newUser.email);
      cy.get('input[name="password"]').type(newUser.password);
      cy.get('input[name="first_name"]').type(newUser.firstName);
      cy.get('input[name="last_name"]').type(newUser.lastName);
      
      // Select role
      cy.get('select[name="role"]').select(newUser.role);
      
      cy.get('button[type="submit"]').click();

      cy.wait('@registerSuccess');
      
      // Should redirect to login with success message
      cy.url().should('include', '/login');
      cy.get('[role="alert"]').should('contain', 'Registro exitoso');
    });

    it('should handle registration errors', () => {
      cy.intercept('POST', '**/auth/register/', {
        statusCode: 400,
        body: { detail: 'Email already exists' }
      }).as('registerFailed');

      cy.get('input[name="email"]').type('existing@example.com');
      cy.get('input[name="password"]').type('Password123!');
      cy.get('input[name="first_name"]').type('Test');
      cy.get('input[name="last_name"]').type('User');
      cy.get('select[name="role"]').select('tenant');
      cy.get('button[type="submit"]').click();

      cy.wait('@registerFailed');
      cy.get('[role="alert"]').should('contain', 'Email already exists');
    });
  });

  describe('Logout Process', () => {
    beforeEach(() => {
      // Login first
      cy.login();
    });

    it('should logout successfully', () => {
      cy.intercept('POST', '**/auth/logout/', {
        statusCode: 200,
        body: {}
      }).as('logoutSuccess');

      // Find and click logout button
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.wait('@logoutSuccess');

      // Should redirect to landing page
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.checkAuthState(false);
    });
  });

  describe('Password Reset', () => {
    it('should navigate to forgot password', () => {
      cy.visit('/login');
      cy.get('a').contains('¿Olvidaste tu contraseña?').click();
      cy.url().should('include', '/forgot-password');
    });

    it('should send password reset request', () => {
      cy.intercept('POST', '**/auth/forgot-password/', {
        statusCode: 200,
        body: { message: 'Reset email sent' }
      }).as('forgotPassword');

      cy.visit('/forgot-password');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();

      cy.wait('@forgotPassword');
      cy.get('[role="alert"]').should('contain', 'email enviado');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      cy.login();
    });

    it('should maintain session across page refreshes', () => {
      cy.visit('/app/properties');
      cy.reload();
      cy.checkAuthState(true);
      cy.url().should('include', '/app');
    });

    it('should handle expired tokens', () => {
      // Simulate expired token
      cy.intercept('GET', '**/auth/me/', {
        statusCode: 401,
        body: { detail: 'Token expired' }
      }).as('tokenExpired');

      cy.reload();
      cy.wait('@tokenExpired');

      // Should redirect to login
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.checkAuthState(false);
    });
  });
});