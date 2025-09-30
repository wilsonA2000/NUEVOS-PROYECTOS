# VeriHome E2E Testing Suite

🧪 **Comprehensive End-to-End Testing Suite for VeriHome Platform**

This testing suite provides automated end-to-end tests for all critical VeriHome functionality including real-time messaging, property management, contract flows, and biometric authentication.

## 🎯 **Test Coverage**

### **Authentication & User Management**
- ✅ User registration and email verification
- ✅ Login/logout flows for all user types (landlord, tenant, service provider)
- ✅ Password recovery and session management
- ✅ Role-based access control and protected routes

### **Property Management** 
- ✅ Property creation with image uploads
- ✅ Property search and filtering
- ✅ Property listing and details views
- ✅ Property editing and management (landlords)
- ✅ Property interest requests (tenants)

### **Real-Time Features (WebSocket)**
- ✅ Real-time messaging and chat
- ✅ Live notifications system
- ✅ User online/offline status
- ✅ Typing indicators and message delivery status
- ✅ WebSocket connection handling and reconnection

### **Contract Management**
- ✅ Contract creation and PDF generation
- ✅ Biometric authentication flow (face, document, voice)
- ✅ Digital signature collection
- ✅ Contract status lifecycle management

### **Performance & Reliability**
- ✅ Page load performance monitoring
- ✅ API response time measurement
- ✅ WebSocket connection performance
- ✅ Error handling and edge cases

## 🚀 **Quick Start**

### **Prerequisites**
- Django backend running on `http://localhost:8000`
- React frontend running on `http://localhost:5173`
- Node.js 16+ installed

### **Setup**
```bash
# Run the automated setup script
python setup-e2e-testing.py

# Or manual setup:
npm install
npx cypress install
```

### **Running Tests**

```bash
# Run all tests
./run-tests.sh full

# Run specific test suites
./run-tests.sh auth          # Authentication tests
./run-tests.sh properties    # Property management tests  
./run-tests.sh websocket     # Real-time messaging tests
./run-tests.sh contracts     # Contract workflow tests

# Open Cypress GUI for interactive testing
./run-tests.sh open
```

### **Windows Users**
```batch
run-tests.bat full
run-tests.bat auth
run-tests.bat open
```

## 📁 **Test Structure**

```
cypress/
├── e2e/
│   ├── auth/                 # Authentication tests
│   │   └── authentication-flow.cy.js
│   ├── properties/           # Property management tests
│   │   └── property-management.cy.js
│   ├── websocket/           # Real-time features tests
│   │   └── real-time-messaging.cy.js
│   ├── contracts/           # Contract workflow tests
│   │   └── contract-flow.cy.js
│   └── smoke/               # Critical functionality tests
│       └── smoke-tests.cy.js
├── fixtures/                # Test data
├── support/                 # Custom commands and utilities
└── screenshots/            # Test failure screenshots
```

## 🛠️ **Custom Commands**

The test suite includes powerful custom commands for common operations:

### **Authentication**
```javascript
cy.loginAs('landlord')        // Quick login for different user types
cy.quickLogin('tenant')       // API-based login (faster)
```

### **Property Management**
```javascript  
cy.createTestProperty(data)   // Create property via API
cy.fillPropertyForm(data)     // Fill property creation form
cy.uploadPropertyImages(3)    // Upload test images
```

### **WebSocket Testing**
```javascript
cy.establishWebSocketConnection('/messaging/')
cy.sendWebSocketMessage(ws, message)
cy.testWebSocketFlow(url, testFunction)
```

### **API Testing**
```javascript
cy.apiRequest('GET', '/properties/')     // Authenticated API calls
cy.measureApiResponse('GET', '/api/')    // Performance measurement
```

## ⚙️ **Configuration**

### **Environment Variables** (`cypress.config.js`)
```javascript
env: {
  BACKEND_URL: 'http://localhost:8000',
  FRONTEND_URL: 'http://localhost:5173',
  
  // Feature flags
  ENABLE_WEBSOCKET_TESTS: true,
  ENABLE_BIOMETRIC_TESTS: false,  // Disable for CI/CD
  
  // Performance thresholds
  MAX_PAGE_LOAD_TIME: 3000,
  MAX_API_RESPONSE_TIME: 2000,
}
```

### **Test Users**
Pre-configured test users for different scenarios:
- `landlord@test.com` / `test123` - Property owner
- `tenant@test.com` / `test123` - Property seeker  
- `service@test.com` / `test123` - Service provider

## 📊 **Test Reports**

### **Generating Reports**
```bash
# Generate detailed HTML reports
npm run reports
npm run merge-reports
npm run generate-report
```

Reports are generated in `cypress/reports/` with:
- Test execution summary
- Screenshots of failures
- Performance metrics
- WebSocket connection logs

### **Performance Monitoring**
Tests automatically measure and report:
- Page load times
- API response times  
- WebSocket connection times
- Form submission performance

## 🔧 **Advanced Features**

### **Database Seeding**
```javascript
cy.seedDatabase()      // Load test fixtures
cy.cleanDatabase()     // Clean up test data
cy.cleanupTestData()   // Remove test properties/contracts
```

### **Error Handling**
- Automatic screenshot on test failure
- Graceful handling of WebSocket disconnections
- Network error simulation and recovery testing
- Browser permission error handling

### **Cross-Browser Testing**
```bash
npx cypress run --browser chrome
npx cypress run --browser firefox
npx cypress run --browser edge
```

## 🎯 **Best Practices**

### **Test Data Management**
- Tests use isolated test data that doesn't affect production
- Automatic cleanup after each test
- Fixtures for consistent test scenarios

### **Performance Testing**
- Every test includes performance assertions
- API calls measured for response time
- Page loads monitored for performance regressions

### **Reliability**
- Tests are designed to be stable and not flaky
- Proper waits and assertions
- Retry logic for WebSocket connections
- Screenshot evidence for failures

## 🚨 **Troubleshooting**

### **Common Issues**

**WebSocket Tests Failing**
```bash
# Check if Django Channels is running
python manage.py runserver  # Should use ASGI for WebSocket support

# Disable WebSocket tests if needed
export ENABLE_WEBSOCKET_TESTS=false
```

**Authentication Errors**
```bash
# Verify test users exist
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> User.objects.filter(email='landlord@test.com').exists()
```

**Performance Test Failures**
- Check if backend/frontend servers are running locally
- Verify system performance (tests expect reasonable response times)
- Adjust performance thresholds in `cypress.config.js`

**Database Connection Issues**  
```bash
# Run the setup script to create test fixtures
python setup-e2e-testing.py
```

## 📈 **Continuous Integration**

### **GitHub Actions Example**
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Start Django
        run: |
          pip install -r requirements.txt
          python manage.py migrate
          python manage.py runserver &
      - name: Start Frontend  
        run: |
          cd frontend
          npm install
          npm run build
          npm run preview &
      - name: Run E2E Tests
        run: |
          cd e2e-testing
          npm install
          npm run test:full
```

## 🎉 **Benefits for Development**

### **Time Savings**
- **Automated Testing**: No more manual testing of complex flows
- **Regression Detection**: Catch bugs before they reach users
- **Performance Monitoring**: Identify performance issues early

### **Quality Assurance**
- **Complete User Flows**: Test entire user journeys automatically
- **Real-Time Features**: Verify WebSocket functionality works correctly
- **Cross-Browser**: Ensure compatibility across different browsers

### **Developer Confidence**
- **Safe Refactoring**: Make changes knowing tests will catch regressions
- **Feature Validation**: Verify new features work as expected
- **Performance Tracking**: Monitor app performance over time

## 📞 **Support**

For questions or issues with the E2E testing suite:

1. Check the test logs in `cypress/logs/`
2. Review screenshots in `cypress/screenshots/` for failed tests
3. Verify all services are running with `./run-tests.sh` (it checks automatically)
4. Check this README for troubleshooting common issues

---

**Happy Testing! 🧪✨**