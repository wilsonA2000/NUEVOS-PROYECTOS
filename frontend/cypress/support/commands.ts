/// <reference types="cypress" />

// VeriHome Custom Commands for Cypress

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to log in a user
       */
      login(email?: string, password?: string): Chainable<Element>;
      
      /**
       * Custom command to log out current user
       */
      logout(): Chainable<Element>;
      
      /**
       * Custom command to register a new user
       */
      register(userData: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        user_type: 'tenant' | 'landlord' | 'service_provider';
        phone_number?: string;
      }): Chainable<Element>;
      
      /**
       * Custom command to wait for page to load completely
       */
      waitForPageLoad(): Chainable<Element>;
      
      /**
       * Custom command to create a test property
       */
      createTestProperty(propertyData?: any): Chainable<Element>;
      
      /**
       * Custom command to check if user is authenticated
       */
      checkAuthState(shouldBeAuthenticated: boolean): Chainable<Element>;
      
      /**
       * Custom command to mock API responses
       */
      mockApiCall(method: string, url: string, response: any): Chainable<Element>;
      
      /**
       * Custom command to fill property form
       */
      fillPropertyForm(propertyData: any): Chainable<Element>;
      
      /**
       * Custom command to search for properties
       */
      searchProperties(query: string): Chainable<Element>;
      
      /**
       * Custom command to wait for loading to finish
       */
      waitForLoading(): Chainable<Element>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email = 'admin@verihome.com', password = 'admin123') => {
  cy.visit('/login');
  cy.waitForPageLoad();
  
  cy.get('[data-testid="email-input"]', { timeout: 10000 })
    .should('be.visible')
    .clear()
    .type(email);
    
  cy.get('[data-testid="password-input"]')
    .should('be.visible')
    .clear()
    .type(password);
    
  cy.get('[data-testid="login-button"]')
    .should('be.visible')
    .should('not.be.disabled')
    .click();
    
  // Wait for redirect to dashboard
  cy.url({ timeout: 15000 }).should('include', '/dashboard');
  cy.waitForPageLoad();
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu-button"]', { timeout: 10000 })
    .should('be.visible')
    .click();
    
  cy.get('[data-testid="logout-button"]')
    .should('be.visible')
    .click();
    
  // Wait for redirect to login
  cy.url({ timeout: 15000 }).should('include', '/login');
});

// Register command
Cypress.Commands.add('register', (userData) => {
  cy.visit('/register');
  cy.waitForPageLoad();
  
  cy.get('[data-testid="first-name-input"]')
    .should('be.visible')
    .type(userData.first_name);
    
  cy.get('[data-testid="last-name-input"]')
    .should('be.visible')
    .type(userData.last_name);
    
  cy.get('[data-testid="email-input"]')
    .should('be.visible')
    .type(userData.email);
    
  cy.get('[data-testid="password-input"]')
    .should('be.visible')
    .type(userData.password);
    
  cy.get('[data-testid="confirm-password-input"]')
    .should('be.visible')
    .type(userData.password);
    
  cy.get('[data-testid="user-type-select"]')
    .should('be.visible')
    .select(userData.user_type);
    
  if (userData.phone_number) {
    cy.get('[data-testid="phone-input"]')
      .should('be.visible')
      .type(userData.phone_number);
  }
  
  cy.get('[data-testid="terms-checkbox"]')
    .should('be.visible')
    .check();
    
  cy.get('[data-testid="register-button"]')
    .should('be.visible')
    .should('not.be.disabled')
    .click();
});

// Wait for page load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.document().should('have.property', 'readyState', 'complete');
  cy.get('[data-testid="loading-spinner"]', { timeout: 1000 }).should('not.exist');
});

// Create test property
Cypress.Commands.add('createTestProperty', (propertyData = {}) => {
  const defaultProperty = {
    title: 'Test Property',
    description: 'A test property for Cypress testing',
    property_type: 'apartment',
    address: 'Test Address 123',
    city: 'Bogotá',
    state: 'Cundinamarca',
    country: 'Colombia',
    price: 2500000,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    ...propertyData,
  };
  
  cy.visit('/properties/new');
  cy.waitForPageLoad();
  cy.fillPropertyForm(defaultProperty);
  
  cy.get('[data-testid="create-property-button"]')
    .should('be.visible')
    .should('not.be.disabled')
    .click();
    
  cy.url({ timeout: 15000 }).should('include', '/properties/');
});

// Check authentication state
Cypress.Commands.add('checkAuthState', (shouldBeAuthenticated) => {
  if (shouldBeAuthenticated) {
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.not.be.null;
    });
    cy.get('[data-testid="user-menu-button"]', { timeout: 5000 }).should('exist');
  } else {
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });
    cy.get('[data-testid="login-button"]', { timeout: 5000 }).should('exist');
  }
});

// Mock API call
Cypress.Commands.add('mockApiCall', (method, url, response) => {
  cy.intercept(method, url, response).as(`mock${method}${url.replace(/[^a-zA-Z0-9]/g, '')}`);
});

// Fill property form
Cypress.Commands.add('fillPropertyForm', (propertyData) => {
  cy.get('[data-testid="property-title-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.title);
    
  cy.get('[data-testid="property-description-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.description);
    
  cy.get('[data-testid="property-type-select"]')
    .should('be.visible')
    .select(propertyData.property_type);
    
  cy.get('[data-testid="property-address-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.address);
    
  cy.get('[data-testid="property-city-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.city);
    
  cy.get('[data-testid="property-state-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.state);
    
  cy.get('[data-testid="property-country-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.country);
    
  cy.get('[data-testid="property-price-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.price.toString());
    
  cy.get('[data-testid="property-bedrooms-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.bedrooms.toString());
    
  cy.get('[data-testid="property-bathrooms-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.bathrooms.toString());
    
  cy.get('[data-testid="property-area-input"]')
    .should('be.visible')
    .clear()
    .type(propertyData.area.toString());
});

// Search properties
Cypress.Commands.add('searchProperties', (query) => {
  cy.get('[data-testid="search-input"]')
    .should('be.visible')
    .clear()
    .type(query);
    
  cy.get('[data-testid="search-button"]')
    .should('be.visible')
    .click();
    
  cy.waitForLoading();
});

// Wait for loading
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 1000 }).should('not.exist');
  cy.get('[data-testid="property-list"]', { timeout: 10000 }).should('be.visible');
});

export {};