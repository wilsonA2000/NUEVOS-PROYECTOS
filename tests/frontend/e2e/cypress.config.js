const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Base configuration
    baseUrl: 'http://localhost:5173', // Frontend URL
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Video and screenshots
    video: true,
    screenshotOnRunFailure: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    
    // Test files
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    
    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Environment variables
    env: {
      // Backend URLs
      BACKEND_URL: 'http://localhost:8000',
      API_URL: 'http://localhost:8000/api/v1',
      
      // WebSocket URLs  
      WS_URL: 'ws://localhost:8000/ws',
      WS_MESSAGING: 'ws://localhost:8000/ws/messaging/',
      WS_NOTIFICATIONS: 'ws://localhost:8000/ws/notifications/',
      WS_USER_STATUS: 'ws://localhost:8000/ws/user-status/',
      
      // Test user credentials
      TEST_LANDLORD_EMAIL: 'landlord@test.com',
      TEST_LANDLORD_PASSWORD: 'test123',
      TEST_TENANT_EMAIL: 'tenant@test.com',
      TEST_TENANT_PASSWORD: 'test123',
      TEST_SERVICE_EMAIL: 'service@test.com',
      TEST_SERVICE_PASSWORD: 'test123',
      
      // Test data
      TEST_PROPERTY_TITLE: 'Cypress Test Property',
      TEST_CONTRACT_TITLE: 'Cypress Test Contract',
      
      // Feature flags
      ENABLE_WEBSOCKET_TESTS: true,
      ENABLE_BIOMETRIC_TESTS: false, // Disable for CI/CD
      ENABLE_FILE_UPLOAD_TESTS: true,
      
      // Performance thresholds
      MAX_PAGE_LOAD_TIME: 3000,
      MAX_API_RESPONSE_TIME: 2000,
      MAX_WEBSOCKET_CONNECTION_TIME: 5000
    },
    
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      
      // Custom task for WebSocket testing
      on('task', {
        // WebSocket connection testing
        testWebSocketConnection({ url, timeout = 5000 }) {
          return new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(url);
            
            const timer = setTimeout(() => {
              ws.close();
              reject(new Error(`WebSocket connection timeout after ${timeout}ms`));
            }, timeout);
            
            ws.on('open', () => {
              clearTimeout(timer);
              ws.close();
              resolve({ success: true, message: 'WebSocket connection successful' });
            });
            
            ws.on('error', (error) => {
              clearTimeout(timer);
              reject(error);
            });
          });
        },
        
        // Database seeding for tests
        seedTestData() {
          // This would connect to Django management command
          const { exec } = require('child_process');
          return new Promise((resolve, reject) => {
            exec('cd ../.. && python manage.py loaddata cypress_test_data.json', (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else {
                resolve({ success: true, output: stdout });
              }
            });
          });
        },
        
        // Clean test data
        cleanTestData() {
          const { exec } = require('child_process');
          return new Promise((resolve, reject) => {
            exec('cd ../.. && python manage.py flush --noinput', (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else {
                resolve({ success: true, output: stdout });
              }
            });
          });
        },
        
        // Log message
        log(message) {
          console.log(message);
          return null;
        }
      });
      
      // Grep plugin for test filtering
      require('@cypress/grep/src/plugin')(config);
      
      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js'
  },
});