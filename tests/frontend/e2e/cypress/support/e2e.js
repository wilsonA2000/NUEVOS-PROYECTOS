// Import commands.js using ES2015 syntax:
import './commands'

// Import cypress plugins
import 'cypress-wait-until'
import 'cypress-file-upload'
import 'cypress-drag-drop'
import 'cypress-real-events'
import '@cypress/grep'

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on uncaught exceptions from the application
  // This is useful for React development errors that don't affect functionality
  if (err.message.includes('ResizeObserver loop limit exceeded') ||
      err.message.includes('Non-Error promise rejection captured') ||
      err.message.includes('Loading chunk')) {
    return false
  }
  return true
})

// Custom command to handle WebSocket connections
Cypress.Commands.add('connectWebSocket', (url, options = {}) => {
  const { timeout = 5000, expectedMessage = null } = options
  
  return cy.window().then((win) => {
    return new Cypress.Promise((resolve, reject) => {
      const ws = new win.WebSocket(url)
      
      const timer = setTimeout(() => {
        ws.close()
        reject(new Error(`WebSocket connection timeout after ${timeout}ms`))
      }, timeout)
      
      ws.onopen = () => {
        clearTimeout(timer)
        if (!expectedMessage) {
          resolve(ws)
        }
      }
      
      ws.onmessage = (event) => {
        if (expectedMessage && event.data.includes(expectedMessage)) {
          clearTimeout(timer)
          resolve({ ws, message: event.data })
        }
      }
      
      ws.onerror = (error) => {
        clearTimeout(timer)
        reject(error)
      }
    })
  })
})

// Custom command for authentication
Cypress.Commands.add('loginAs', (userType) => {
  const users = {
    landlord: {
      email: Cypress.env('TEST_LANDLORD_EMAIL'),
      password: Cypress.env('TEST_LANDLORD_PASSWORD')
    },
    tenant: {
      email: Cypress.env('TEST_TENANT_EMAIL'),
      password: Cypress.env('TEST_TENANT_PASSWORD')
    },
    service: {
      email: Cypress.env('TEST_SERVICE_EMAIL'),
      password: Cypress.env('TEST_SERVICE_PASSWORD')
    }
  }
  
  const user = users[userType]
  if (!user) {
    throw new Error(`Unknown user type: ${userType}`)
  }
  
  // Clear any existing auth state
  cy.clearLocalStorage()
  cy.clearCookies()
  
  // Visit login page
  cy.visit('/login')
  
  // Fill and submit login form
  cy.get('[data-cy=email-input]').type(user.email)
  cy.get('[data-cy=password-input]').type(user.password)
  cy.get('[data-cy=login-button]').click()
  
  // Wait for successful login (redirect to dashboard)
  cy.url().should('not.include', '/login')
  cy.get('[data-cy=dashboard]').should('be.visible')
  
  // Store auth token for API requests
  cy.window().its('localStorage').invoke('getItem', 'access_token').then((token) => {
    if (token) {
      cy.wrap(token).as('authToken')
    }
  })
})

// Custom command for API requests with auth
Cypress.Commands.add('apiRequest', (method, url, options = {}) => {
  const { body, headers = {}, ...restOptions } = options
  
  return cy.get('@authToken').then((token) => {
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
    
    return cy.request({
      method,
      url: `${Cypress.env('API_URL')}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers
      },
      body,
      failOnStatusCode: false,
      ...restOptions
    })
  })
})

// Custom command to wait for element with retry logic
Cypress.Commands.add('waitForElement', (selector, options = {}) => {
  const { timeout = 10000, retries = 3 } = options
  
  const attemptFind = (attempt = 1) => {
    return cy.get('body').then(($body) => {
      if ($body.find(selector).length > 0) {
        return cy.get(selector, { timeout })
      } else if (attempt < retries) {
        cy.wait(1000)
        return attemptFind(attempt + 1)
      } else {
        throw new Error(`Element ${selector} not found after ${retries} attempts`)
      }
    })
  }
  
  return attemptFind()
})

// Custom command to handle file uploads
Cypress.Commands.add('uploadFile', (selector, fileName, fileType = 'application/json') => {
  return cy.get(selector).selectFile({
    contents: Cypress.Buffer.from('file contents'),
    fileName: fileName,
    mimeType: fileType,
  })
})

// Custom command to simulate real user interactions
Cypress.Commands.add('realType', { prevSubject: 'element' }, (subject, text, options = {}) => {
  const { delay = 50 } = options
  
  cy.wrap(subject).focus()
  
  for (let i = 0; i < text.length; i++) {
    cy.wrap(subject).realType(text[i])
    if (delay > 0) {
      cy.wait(delay)
    }
  }
})

// Performance monitoring commands
Cypress.Commands.add('measurePageLoad', (expectedMaxTime = 3000) => {
  cy.window().then((win) => {
    const startTime = win.performance.now()
    
    return cy.get('body').should('be.visible').then(() => {
      const endTime = win.performance.now()
      const loadTime = endTime - startTime
      
      cy.log(`Page load time: ${loadTime.toFixed(2)}ms`)
      
      if (loadTime > expectedMaxTime) {
        cy.log(`⚠️ Page load time (${loadTime.toFixed(2)}ms) exceeds threshold (${expectedMaxTime}ms)`)
      }
      
      return loadTime
    })
  })
})

// WebSocket testing utilities
Cypress.Commands.add('testWebSocketFlow', (wsUrl, testFlow) => {
  if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) {
    cy.log('WebSocket tests disabled, skipping...')
    return
  }
  
  return cy.connectWebSocket(wsUrl).then((ws) => {
    return new Cypress.Promise((resolve) => {
      testFlow(ws, resolve)
    })
  })
})

// Database utilities
Cypress.Commands.add('seedDatabase', () => {
  return cy.task('seedTestData')
})

Cypress.Commands.add('cleanDatabase', () => {
  return cy.task('cleanTestData')
})

// Screenshot and video utilities
Cypress.Commands.add('takeScreenshotOnFailure', (testName) => {
  cy.screenshot(`${testName}-failure`, { capture: 'fullPage' })
})

// Setup hooks for better test isolation
beforeEach(() => {
  // Clear browser state
  cy.clearLocalStorage()
  cy.clearCookies()
  
  // Set consistent viewport
  cy.viewport(1280, 720)
  
  // Add custom CSS to hide animations (for stable testing)
  cy.window().then((win) => {
    const style = win.document.createElement('style')
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
    win.document.head.appendChild(style)
  })
})

afterEach(() => {
  // Clean up after each test
  cy.window().then((win) => {
    // Close any open WebSocket connections
    if (win.websocketConnections) {
      win.websocketConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      })
    }
  })
})