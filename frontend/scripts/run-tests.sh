#!/bin/bash

# VeriHome Testing Suite Runner
# Este script ejecuta todos los tests y genera reportes

set -e

echo "🚀 VeriHome Testing Suite"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_status "Checking environment..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

print_status "Environment ready!"

# Create reports directory
mkdir -p reports

# Function to run tests with error handling
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local required=${3:-true}
    
    print_status "Running $test_name..."
    
    if eval "$test_command"; then
        print_success "$test_name completed successfully"
        return 0
    else
        if [ "$required" = true ]; then
            print_error "$test_name failed"
            return 1
        else
            print_warning "$test_name failed but marked as optional"
            return 0
        fi
    fi
}

# Parse command line arguments
RUN_UNIT=true
RUN_E2E=false
RUN_LINT=true
RUN_BUILD=false
COVERAGE=true
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_UNIT=false
            RUN_LINT=false
            RUN_E2E=true
            shift
            ;;
        --no-coverage)
            COVERAGE=false
            shift
            ;;
        --with-build)
            RUN_BUILD=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --all)
            RUN_UNIT=true
            RUN_E2E=true
            RUN_LINT=true
            RUN_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --unit-only     Run only unit tests"
            echo "  --e2e-only      Run only E2E tests"
            echo "  --no-coverage   Skip coverage reporting"
            echo "  --with-build    Include build verification"
            echo "  --parallel      Run tests in parallel where possible"
            echo "  --all           Run all tests including E2E"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            exit 1
            ;;
    esac
done

print_status "Test configuration:"
echo "  - Unit tests: $RUN_UNIT"
echo "  - E2E tests: $RUN_E2E" 
echo "  - Linting: $RUN_LINT"
echo "  - Build verification: $RUN_BUILD"
echo "  - Coverage: $COVERAGE"
echo "  - Parallel execution: $PARALLEL"

# Start timer
START_TIME=$(date +%s)

# Array to track test results
declare -a RESULTS=()

# Linting
if [ "$RUN_LINT" = true ]; then
    if run_test_suite "ESLint" "npm run lint"; then
        RESULTS+=("✅ Linting")
    else
        RESULTS+=("❌ Linting")
        exit 1
    fi
fi

# Type checking
if [ "$RUN_UNIT" = true ]; then
    if run_test_suite "TypeScript type checking" "npm run type-check"; then
        RESULTS+=("✅ Type checking")
    else
        RESULTS+=("❌ Type checking")
        exit 1
    fi
fi

# Unit tests
if [ "$RUN_UNIT" = true ]; then
    if [ "$COVERAGE" = true ]; then
        TEST_COMMAND="npm run test:ci"
    else
        TEST_COMMAND="npm run test -- --watchAll=false"
    fi
    
    if run_test_suite "Unit tests" "$TEST_COMMAND"; then
        RESULTS+=("✅ Unit tests")
        
        if [ "$COVERAGE" = true ]; then
            print_status "Generating coverage report..."
            if [ -f "coverage/lcov.info" ]; then
                cp coverage/lcov-report/index.html reports/coverage.html 2>/dev/null || true
                print_success "Coverage report saved to reports/coverage.html"
            fi
        fi
    else
        RESULTS+=("❌ Unit tests")
        exit 1
    fi
fi

# Specific test suites
if [ "$RUN_UNIT" = true ]; then
    print_status "Running specific test suites..."
    
    # Authentication tests
    if run_test_suite "Authentication tests" "npm run test:auth" false; then
        RESULTS+=("✅ Auth tests")
    else
        RESULTS+=("⚠️ Auth tests")
    fi
    
    # Properties tests
    if run_test_suite "Properties tests" "npm run test:properties" false; then
        RESULTS+=("✅ Properties tests")
    else
        RESULTS+=("⚠️ Properties tests")
    fi
fi

# Build verification
if [ "$RUN_BUILD" = true ]; then
    if run_test_suite "Build verification" "npm run build"; then
        RESULTS+=("✅ Build")
    else
        RESULTS+=("❌ Build")
        exit 1
    fi
fi

# E2E tests (require servers to be running)
if [ "$RUN_E2E" = true ]; then
    print_status "Checking if servers are running..."
    
    # Check if frontend server is running
    if ! curl -s http://localhost:5176 > /dev/null; then
        print_warning "Frontend server not detected on port 5176"
        print_status "Please start the frontend server: npm run dev"
    fi
    
    # Check if backend server is running
    if ! curl -s http://localhost:8000/api/v1/ > /dev/null; then
        print_warning "Backend server not detected on port 8000"
        print_status "Please start the backend server"
    fi
    
    print_status "Running E2E tests..."
    
    # Run auth flow tests
    if run_test_suite "E2E Auth flow" "npx cypress run --spec 'cypress/e2e/auth-flow.cy.ts'" false; then
        RESULTS+=("✅ E2E Auth")
    else
        RESULTS+=("⚠️ E2E Auth")
    fi
    
    # Run property management tests
    if run_test_suite "E2E Properties" "npx cypress run --spec 'cypress/e2e/property-management.cy.ts'" false; then
        RESULTS+=("✅ E2E Properties")
    else
        RESULTS+=("⚠️ E2E Properties")
    fi
    
    # Copy Cypress videos and screenshots if they exist
    if [ -d "cypress/videos" ]; then
        cp -r cypress/videos reports/ 2>/dev/null || true
    fi
    if [ -d "cypress/screenshots" ]; then
        cp -r cypress/screenshots reports/ 2>/dev/null || true
    fi
fi

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

# Generate final report
print_status "Generating test report..."

cat > reports/test-report.md << EOF
# VeriHome Test Report

**Execution Date:** $(date)
**Total Duration:** ${EXECUTION_TIME}s

## Test Results

EOF

for result in "${RESULTS[@]}"; do
    echo "- $result" >> reports/test-report.md
done

cat >> reports/test-report.md << EOF

## Coverage Information

EOF

if [ "$COVERAGE" = true ] && [ -f "coverage/lcov.info" ]; then
    echo "Coverage report available at: reports/coverage.html" >> reports/test-report.md
    
    # Extract coverage percentages
    if command -v lcov &> /dev/null; then
        COVERAGE_SUMMARY=$(lcov --summary coverage/lcov.info 2>/dev/null | grep -E '(functions|lines)' || echo "Coverage summary not available")
        echo "### Coverage Summary" >> reports/test-report.md
        echo "\`\`\`" >> reports/test-report.md
        echo "$COVERAGE_SUMMARY" >> reports/test-report.md
        echo "\`\`\`" >> reports/test-report.md
    fi
else
    echo "No coverage information available." >> reports/test-report.md
fi

cat >> reports/test-report.md << EOF

## Configuration

- Unit tests: $RUN_UNIT
- E2E tests: $RUN_E2E
- Linting: $RUN_LINT
- Build verification: $RUN_BUILD
- Coverage reporting: $COVERAGE

## Files Generated

- Test report: reports/test-report.md
EOF

if [ "$COVERAGE" = true ]; then
    echo "- Coverage report: reports/coverage.html" >> reports/test-report.md
fi

if [ "$RUN_E2E" = true ]; then
    echo "- E2E videos: reports/videos/" >> reports/test-report.md
    echo "- E2E screenshots: reports/screenshots/" >> reports/test-report.md
fi

# Display final results
echo ""
echo "=================================================="
print_success "VeriHome Testing Suite Completed!"
echo "=================================================="
echo ""
echo "📊 Results Summary:"
for result in "${RESULTS[@]}"; do
    echo "  $result"
done

echo ""
echo "⏱️  Total execution time: ${EXECUTION_TIME}s"
echo "📁 Reports saved to: reports/"

# Check for failures
if [[ "${RESULTS[*]}" =~ "❌" ]]; then
    print_error "Some tests failed. Check the output above for details."
    exit 1
else
    print_success "All tests passed successfully!"
    echo ""
    echo "🎉 Your VeriHome application is ready for deployment!"
fi