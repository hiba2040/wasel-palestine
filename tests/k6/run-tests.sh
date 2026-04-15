#!/usr/bin/env bash

# ===============================================
# k6 Performance Testing Suite Runner
# ===============================================
# This script runs all k6 tests and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="tests/k6/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$RESULTS_DIR/report_$TIMESTAMP.txt"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Wasel Palestine k6 Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}API URL: $API_URL${NC}"
echo -e "${YELLOW}Results Directory: $RESULTS_DIR${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please install it first.${NC}"
    echo "Visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✅ k6 is installed (version: $(k6 version))${NC}"
echo ""

# Wait for API to be ready
echo -e "${YELLOW}📋 Checking if API is running...${NC}"
for i in {1..30}; do
    if curl -s -f "$API_URL/" > /dev/null; then
        echo -e "${GREEN}✅ API is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ API did not start within 30 seconds${NC}"
        exit 1
    fi
    echo "Waiting for API... (attempt $i/30)"
    sleep 1
done

echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local test_description=$3
    
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  Test: $test_name${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "Description: $test_description"
    echo ""
    
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ Test file not found: $test_file${NC}"
        return 1
    fi
    
    # Run the test with output
    if k6 run "$test_file" \
        --vus 0 \
        --out json="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json" \
        -e BASE_URL="$API_URL"; then
        echo -e "${GREEN}✅ $test_name passed!${NC}"
        echo "" >> "$REPORT_FILE"
        echo "✅ $test_name: PASSED" >> "$REPORT_FILE"
        return 0
    else
        echo -e "${RED}❌ $test_name failed!${NC}"
        echo "" >> "$REPORT_FILE"
        echo "❌ $test_name: FAILED" >> "$REPORT_FILE"
        return 1
    fi
}

# Initialize report file
{
    echo "Wasel Palestine - k6 Performance Test Report"
    echo "Generated: $(date)"
    echo "API URL: $API_URL"
    echo ""
    echo "Test Results:"
    echo "=============="
} > "$REPORT_FILE"

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run API Tests (fastest, run first)
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "API-Tests" "tests/k6/apiTests.js" "Functional API tests for all endpoints"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""
sleep 2

# Run Load Test
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Load-Test" "tests/k6/loadTest.js" "Sustained load test with 100 concurrent users"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""
sleep 5

# Run Stress Test
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Stress-Test" "tests/k6/stressTest.js" "Stress test to find breaking point"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""
sleep 5

# Run Soak Test (only if requested)
if [ "${RUN_SOAK:-false}" = "true" ]; then
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}⚠️  Note: Soak test will run for 18 minutes${NC}"
    echo ""
    if run_test "Soak-Test" "tests/k6/soakTest.js" "Long-running soak test for stability (18 minutes)"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    echo -e "${YELLOW}⏭️  Skipping Soak Test (set RUN_SOAK=true to include)${NC}"
    echo ""
fi

# Print summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "Passed Tests:  ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed Tests:  ${RED}$FAILED_TESTS${NC}"
echo ""
echo -e "Results saved to: ${YELLOW}$REPORT_FILE${NC}"
echo -e "JSON Results:    ${YELLOW}$RESULTS_DIR${NC}"
echo ""

# Add summary to report
{
    echo ""
    echo "Summary"
    echo "======="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo ""
    echo "Test Files Generated:"
    ls -1 "$RESULTS_DIR"/*.json 2>/dev/null | sed 's/^/  - /'
} >> "$REPORT_FILE"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the detailed report: $REPORT_FILE"
    echo "2. Check JSON results for detailed metrics: $RESULTS_DIR"
    echo "3. Monitor performance metrics and identify bottlenecks"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review the report for details.${NC}"
    echo ""
    cat "$REPORT_FILE"
    echo ""
    exit 1
fi
