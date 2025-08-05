describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear any existing authentication state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login', () => {
    it('should successfully log in with valid credentials', () => {
      // Mock successful login API calls
      cy.intercept('POST', '/api/v1/auth/login/', {
        statusCode: 200,
        body: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
        },
      }).as('loginRequest');

      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        fixture: 'user.json',
      }).as('getUserRequest');

      cy.visit('/login');
      cy.waitForPageLoad();

      // Verify login form elements are present
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('be.visible');

      // Fill and submit login form
      cy.get('[data-testid="email-input"]').type('admin@verihome.com');
      cy.get('[data-testid="password-input"]').type('admin123');
      cy.get('[data-testid="login-button"]').click();

      // Verify API calls were made
      cy.wait('@loginRequest');
      cy.wait('@getUserRequest');

      // Verify successful login redirect
      cy.url().should('include', '/dashboard');
      cy.checkAuthState(true);
    });

    it('should show error for invalid credentials', () => {
      // Mock failed login API call
      cy.intercept('POST', '/api/v1/auth/login/', {
        statusCode: 401,
        body: {
          detail: 'Credenciales inválidas. Por favor, verifica tu email y contraseña.',
        },
      }).as('loginRequest');

      cy.visit('/login');
      cy.waitForPageLoad();

      cy.get('[data-testid="email-input"]').type('wrong@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@loginRequest');

      // Verify error message is displayed
      cy.contains('Credenciales inválidas').should('be.visible');
      
      // Verify user stays on login page
      cy.url().should('include', '/login');
      cy.checkAuthState(false);
    });

    it('should validate required fields', () => {
      cy.visit('/login');
      cy.waitForPageLoad();

      // Try to submit without filling fields
      cy.get('[data-testid="login-button"]').click();

      // Verify validation messages
      cy.contains('Email es requerido').should('be.visible');
      cy.contains('Contraseña es requerida').should('be.visible');
    });

    it('should validate email format', () => {
      cy.visit('/login');
      cy.waitForPageLoad();

      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      cy.contains('Email inválido').should('be.visible');
    });

    it('should toggle password visibility', () => {
      cy.visit('/login');
      cy.waitForPageLoad();

      // Password should start as hidden
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');

      // Click toggle button
      cy.get('[data-testid="toggle-password-visibility"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');

      // Click again to hide
      cy.get('[data-testid="toggle-password-visibility"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });

    it('should handle network errors gracefully', () => {
      // Mock network error
      cy.intercept('POST', '/api/v1/auth/login/', {
        forceNetworkError: true,
      }).as('loginRequest');

      cy.visit('/login');
      cy.waitForPageLoad();

      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@loginRequest');

      // Verify network error message
      cy.contains('Error de conexión').should('be.visible');
    });
  });

  describe('Registration', () => {
    it('should successfully register a new tenant', () => {
      // Mock successful registration
      cy.intercept('POST', '/api/v1/auth/register/', {
        statusCode: 201,
        body: {
          user_id: 1,
        },
      }).as('registerRequest');

      const userData = {
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        first_name: 'New',
        last_name: 'User',
        user_type: 'tenant',
        phone_number: '+57 300 123 4567',
      };

      cy.register(userData);

      cy.wait('@registerRequest');

      // Verify success message and redirect
      cy.contains('Registro exitoso').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('should register a landlord with interview code', () => {
      cy.intercept('POST', '/api/v1/auth/register/', {
        statusCode: 201,
        body: {
          user_id: 2,
        },
      }).as('registerRequest');

      cy.visit('/register');
      cy.waitForPageLoad();

      // Fill basic information
      cy.get('[data-testid="first-name-input"]').type('Jane');
      cy.get('[data-testid="last-name-input"]').type('Smith');
      cy.get('[data-testid="email-input"]').type('landlord@example.com');
      cy.get('[data-testid="password-input"]').type('Password123!');
      cy.get('[data-testid="confirm-password-input"]').type('Password123!');

      // Select landlord - this should show interview code field
      cy.get('[data-testid="user-type-select"]').select('landlord');
      cy.get('[data-testid="interview-code-input"]').should('be.visible');
      cy.get('[data-testid="interview-code-input"]').type('INTERVIEW123');

      cy.get('[data-testid="phone-input"]').type('+57 300 987 6543');
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="register-button"]').click();

      cy.wait('@registerRequest');
      cy.url().should('include', '/login');
    });

    it('should validate password requirements', () => {
      cy.visit('/register');
      cy.waitForPageLoad();

      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="register-button"]').click();

      cy.contains('La contraseña debe tener al menos 8 caracteres').should('be.visible');
    });

    it('should validate password confirmation', () => {
      cy.visit('/register');
      cy.waitForPageLoad();

      cy.get('[data-testid="password-input"]').type('Password123!');
      cy.get('[data-testid="confirm-password-input"]').type('DifferentPassword123!');
      cy.get('[data-testid="register-button"]').click();

      cy.contains('Las contraseñas no coinciden').should('be.visible');
    });

    it('should require terms acceptance', () => {
      cy.visit('/register');
      cy.waitForPageLoad();

      // Fill all fields except terms
      cy.get('[data-testid="first-name-input"]').type('Test');
      cy.get('[data-testid="last-name-input"]').type('User');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('Password123!');
      cy.get('[data-testid="confirm-password-input"]').type('Password123!');
      cy.get('[data-testid="user-type-select"]').select('tenant');
      
      // Don't check terms
      cy.get('[data-testid="register-button"]').click();

      cy.contains('Debes aceptar los términos').should('be.visible');
    });

    it('should handle email already exists error', () => {
      cy.intercept('POST', '/api/v1/auth/register/', {
        statusCode: 400,
        body: {
          detail: 'Este email ya está registrado',
        },
      }).as('registerRequest');

      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        first_name: 'Existing',
        last_name: 'User',
        user_type: 'tenant',
      };

      cy.register(userData);

      cy.wait('@registerRequest');
      cy.contains('Este email ya está registrado').should('be.visible');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Login before each logout test
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'mock-token');
        win.localStorage.setItem('refresh', 'mock-refresh-token');
      });

      cy.intercept('GET', '/api/v1/auth/me/', {
        fixture: 'user.json',
      }).as('getUserRequest');

      cy.intercept('POST', '/api/v1/auth/logout/', {
        statusCode: 200,
        body: {},
      }).as('logoutRequest');
    });

    it('should successfully logout user', () => {
      cy.visit('/dashboard');
      cy.wait('@getUserRequest');

      cy.logout();

      cy.wait('@logoutRequest');
      cy.checkAuthState(false);
    });

    it('should clear authentication state on logout', () => {
      cy.visit('/dashboard');
      cy.wait('@getUserRequest');

      cy.logout();

      // Verify tokens are cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
        expect(win.localStorage.getItem('refresh')).to.be.null;
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should allow authenticated users to access protected routes', () => {
      // Mock authentication
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'mock-token');
      });

      cy.intercept('GET', '/api/v1/auth/me/', {
        fixture: 'user.json',
      }).as('getUserRequest');

      cy.visit('/dashboard');
      cy.wait('@getUserRequest');

      cy.url().should('include', '/dashboard');
    });

    it('should handle token expiration gracefully', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'expired-token');
      });

      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 401,
        body: {
          detail: 'Token has expired',
        },
      }).as('getUserRequest');

      cy.visit('/dashboard');
      cy.wait('@getUserRequest');

      // Should redirect to login on token expiration
      cy.url().should('include', '/login');
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      cy.intercept('POST', '/api/v1/auth/forgot-password/', {
        statusCode: 200,
        body: { success: true },
      }).as('forgotPasswordRequest');

      cy.visit('/forgot-password');
      cy.waitForPageLoad();

      cy.get('[data-testid="email-input"]').type('user@example.com');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@forgotPasswordRequest');
      cy.contains('Correo de restablecimiento enviado').should('be.visible');
    });

    it('should handle invalid email for password reset', () => {
      cy.intercept('POST', '/api/v1/auth/forgot-password/', {
        statusCode: 404,
        body: {
          detail: 'Usuario no encontrado',
        },
      }).as('forgotPasswordRequest');

      cy.visit('/forgot-password');
      cy.waitForPageLoad();

      cy.get('[data-testid="email-input"]').type('nonexistent@example.com');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@forgotPasswordRequest');
      cy.contains('Usuario no encontrado').should('be.visible');
    });
  });

  describe('Session Management', () => {
    it('should maintain session across page refreshes', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'valid-token');
      });

      cy.intercept('GET', '/api/v1/auth/me/', {
        fixture: 'user.json',
      }).as('getUserRequest');

      cy.visit('/dashboard');
      cy.wait('@getUserRequest');
      cy.checkAuthState(true);

      // Refresh page
      cy.reload();
      cy.wait('@getUserRequest');
      cy.checkAuthState(true);
    });

    it('should handle concurrent tab logout', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'valid-token');
      });

      cy.intercept('GET', '/api/v1/auth/me/', {
        fixture: 'user.json',
      }).as('getUserRequest');

      cy.visit('/dashboard');
      cy.wait('@getUserRequest');

      // Simulate logout from another tab
      cy.window().then((win) => {
        win.localStorage.removeItem('token');
        win.localStorage.removeItem('refresh');
        
        // Trigger storage event
        const storageEvent = new StorageEvent('storage', {
          key: 'token',
          oldValue: 'valid-token',
          newValue: null,
        });
        win.dispatchEvent(storageEvent);
      });

      // Should redirect to login
      cy.url({ timeout: 5000 }).should('include', '/login');
    });
  });
});