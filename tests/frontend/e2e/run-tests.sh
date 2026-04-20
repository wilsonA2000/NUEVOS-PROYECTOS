#!/bin/bash

# VeriHome E2E Testing Runner
# Executes different test suites based on the provided argument

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VeriHome E2E Testing Suite${NC}"
echo "=========================================="

# Function to check if servers are running
check_servers() {
    echo -e "${YELLOW}🔍 Checking server status...${NC}"

    # Check Django backend
    if curl -s http://localhost:8000/api/v1/properties/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Django backend running (localhost:8000)${NC}"
    else
        echo -e "${RED}❌ Django backend not running. Start with: python manage.py runserver${NC}"
        exit 1
    fi

    # Check React frontend
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ React frontend running (localhost:5173)${NC}"
    else
        echo -e "${RED}❌ React frontend not running. Start with: cd frontend && npm run dev${NC}"
        exit 1
    fi

    echo ""
}

# Function to run specific test suite
run_tests() {
    local suite=$1
    local spec_pattern=$2
    local description=$3

    echo -e "${BLUE}🧪 Running ${description}...${NC}"
    echo "Spec pattern: ${spec_pattern}"
    echo ""

    npx cypress run --spec "${spec_pattern}" --browser electron --headless

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${description} completed successfully!${NC}"
    else
        echo -e "${RED}❌ ${description} failed!${NC}"
        exit 1
    fi
    echo ""
}

# Function to show usage
show_usage() {
    echo -e "${YELLOW}Usage: $0 [test-type]${NC}"
    echo ""
    echo "Available test types:"
    echo "  smoke      - Quick smoke tests (critical functionality)"
    echo "  auth       - Authentication flow tests"
    echo "  properties - Property management tests"
    echo "  websocket  - Real-time messaging tests"
    echo "  contracts  - Contract workflow tests"
    echo "  full       - All test suites"
    echo "  open       - Open Cypress GUI"
    echo ""
    echo "Examples:"
    echo "  $0 smoke"
    echo "  $0 auth"
    echo "  $0 full"
    echo "  $0 open"
}

# Main execution
case "$1" in
    "smoke")
        check_servers
        run_tests "smoke" "cypress/e2e/smoke/**/*.cy.js" "Smoke Tests"
        echo -e "${GREEN}🎉 Smoke tests completed! Your application is working correctly.${NC}"
        ;;

    "auth")
        check_servers
        run_tests "auth" "cypress/e2e/auth/**/*.cy.js" "Authentication Tests"
        echo -e "${GREEN}🎉 Authentication tests completed!${NC}"
        ;;

    "properties")
        check_servers
        run_tests "properties" "cypress/e2e/properties/**/*.cy.js" "Property Management Tests"
        echo -e "${GREEN}🎉 Property management tests completed!${NC}"
        ;;

    "websocket")
        check_servers
        run_tests "websocket" "cypress/e2e/websocket/**/*.cy.js" "WebSocket Tests"
        echo -e "${GREEN}🎉 WebSocket tests completed!${NC}"
        ;;

    "contracts")
        check_servers
        run_tests "contracts" "cypress/e2e/contracts/**/*.cy.js" "Contract Tests"
        echo -e "${GREEN}🎉 Contract tests completed!${NC}"
        ;;

    "full")
        check_servers
        echo -e "${BLUE}🔥 Running complete E2E test suite...${NC}"
        echo ""

        run_tests "smoke" "cypress/e2e/smoke/**/*.cy.js" "Smoke Tests"
        run_tests "auth" "cypress/e2e/auth/**/*.cy.js" "Authentication Tests"
        run_tests "properties" "cypress/e2e/properties/**/*.cy.js" "Property Management Tests"
        run_tests "websocket" "cypress/e2e/websocket/**/*.cy.js" "WebSocket Tests"
        run_tests "contracts" "cypress/e2e/contracts/**/*.cy.js" "Contract Tests"

        echo -e "${GREEN}🎉 All E2E tests completed successfully!${NC}"
        echo -e "${GREEN}✨ Your VeriHome application is fully tested and working correctly!${NC}"
        ;;

    "open")
        check_servers
        echo -e "${BLUE}🖥️  Opening Cypress GUI...${NC}"
        npx cypress open
        ;;

    *)
        show_usage
        exit 1
        ;;
esac
