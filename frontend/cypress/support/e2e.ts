// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import Cypress commands
import 'cypress-real-events/support';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // for certain expected errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Script error')) {
    return false;
  }
  return true;
});

// Custom configurations for VeriHome
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up common viewport
  cy.viewport(1280, 720);
  
  // Intercept common API calls
  cy.intercept('GET', '/api/v1/auth/me/', { fixture: 'user.json' }).as('getCurrentUser');
  cy.intercept('GET', '/api/v1/properties/**', { fixture: 'properties.json' }).as('getProperties');
});

// Global error handling
Cypress.on('fail', (error, runnable) => {
  // Log additional context for debugging
  cy.task('log', `Test failed: ${runnable.title}`);
  cy.task('log', `Error: ${error.message}`);
  throw error;
});