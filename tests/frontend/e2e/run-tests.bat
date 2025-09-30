@echo off
:: VeriHome E2E Testing Runner for Windows
:: Executes different test suites based on the provided argument

setlocal EnableDelayedExpansion

echo 🚀 VeriHome E2E Testing Suite
echo ==========================================

if "%1"=="" (
    goto :show_usage
)

:: Function to check if servers are running
echo 🔍 Checking server status...

:: Check Django backend
curl -s http://localhost:8000/api/v1/properties/ >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Django backend running (localhost:8000)
) else (
    echo ❌ Django backend not running. Start with: python manage.py runserver
    exit /b 1
)

:: Check React frontend
curl -s http://localhost:5173/ >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ React frontend running (localhost:5173)
) else (
    echo ❌ React frontend not running. Start with: cd frontend && npm run dev
    exit /b 1
)

echo.

if "%1"=="smoke" (
    echo 🧪 Running Smoke Tests...
    npx cypress run --spec "cypress/e2e/smoke/**/*.cy.js" --browser electron --headless
    if !errorlevel! equ 0 (
        echo ✅ Smoke tests completed successfully!
        echo 🎉 Your application is working correctly.
    ) else (
        echo ❌ Smoke tests failed!
        exit /b 1
    )
    goto :end
)

if "%1"=="auth" (
    echo 🧪 Running Authentication Tests...
    npx cypress run --spec "cypress/e2e/auth/**/*.cy.js" --browser electron --headless
    if !errorlevel! equ 0 (
        echo ✅ Authentication tests completed!
    ) else (
        echo ❌ Authentication tests failed!
        exit /b 1
    )
    goto :end
)

if "%1"=="properties" (
    echo 🧪 Running Property Management Tests...
    npx cypress run --spec "cypress/e2e/properties/**/*.cy.js" --browser electron --headless
    if !errorlevel! equ 0 (
        echo ✅ Property management tests completed!
    ) else (
        echo ❌ Property management tests failed!
        exit /b 1
    )
    goto :end
)

if "%1"=="websocket" (
    echo 🧪 Running WebSocket Tests...
    npx cypress run --spec "cypress/e2e/websocket/**/*.cy.js" --browser electron --headless
    if !errorlevel! equ 0 (
        echo ✅ WebSocket tests completed!
    ) else (
        echo ❌ WebSocket tests failed!
        exit /b 1
    )
    goto :end
)

if "%1"=="contracts" (
    echo 🧪 Running Contract Tests...
    npx cypress run --spec "cypress/e2e/contracts/**/*.cy.js" --browser electron --headless
    if !errorlevel! equ 0 (
        echo ✅ Contract tests completed!
    ) else (
        echo ❌ Contract tests failed!
        exit /b 1
    )
    goto :end
)

if "%1"=="full" (
    echo 🔥 Running complete E2E test suite...
    echo.
    
    echo 🧪 Running Smoke Tests...
    npx cypress run --spec "cypress/e2e/smoke/**/*.cy.js" --browser electron --headless
    if !errorlevel! neq 0 goto :test_failed
    
    echo 🧪 Running Authentication Tests...
    npx cypress run --spec "cypress/e2e/auth/**/*.cy.js" --browser electron --headless
    if !errorlevel! neq 0 goto :test_failed
    
    echo 🧪 Running Property Management Tests...
    npx cypress run --spec "cypress/e2e/properties/**/*.cy.js" --browser electron --headless
    if !errorlevel! neq 0 goto :test_failed
    
    echo 🧪 Running WebSocket Tests...
    npx cypress run --spec "cypress/e2e/websocket/**/*.cy.js" --browser electron --headless
    if !errorlevel! neq 0 goto :test_failed
    
    echo 🧪 Running Contract Tests...
    npx cypress run --spec "cypress/e2e/contracts/**/*.cy.js" --browser electron --headless
    if !errorlevel! neq 0 goto :test_failed
    
    echo ✅ All E2E tests completed successfully!
    echo ✨ Your VeriHome application is fully tested and working correctly!
    goto :end
)

if "%1"=="open" (
    echo 🖥️ Opening Cypress GUI...
    npx cypress open
    goto :end
)

:show_usage
echo Usage: %0 [test-type]
echo.
echo Available test types:
echo   smoke      - Quick smoke tests (critical functionality)
echo   auth       - Authentication flow tests
echo   properties - Property management tests
echo   websocket  - Real-time messaging tests
echo   contracts  - Contract workflow tests
echo   full       - All test suites
echo   open       - Open Cypress GUI
echo.
echo Examples:
echo   %0 smoke
echo   %0 auth
echo   %0 full
echo   %0 open
goto :end

:test_failed
echo ❌ Tests failed!
exit /b 1

:end