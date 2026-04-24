# ===============================================
# k6 Performance Testing Suite Runner (Windows)
# ===============================================
# This script runs all k6 tests and generates reports

param(
    [string]$ApiUrl = "http://localhost:3000",
    [switch]$RunSoak = $false
)

# Colors and formatting
function Write-Header {
    param([string]$Text)
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

# Setup
$ResultsDir = "tests\k6\results"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportFile = "$ResultsDir\report_$Timestamp.txt"
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0

# Create results directory
if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir | Out-Null
}

Write-Host ""
Write-Header "Wasel Palestine k6 Test Suite"
Write-Host ""
Write-Info "API URL: $ApiUrl"
Write-Info "Results Directory: $ResultsDir"
Write-Host ""

# Check if k6 is installed
Write-Info "Checking if k6 is installed..."
$k6Check = k6 version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "k6 is not installed. Please install it first."
    Write-Host "Visit: https://k6.io/docs/getting-started/installation/" -ForegroundColor Cyan
    exit 1
}

Write-Success "k6 is installed ($k6Check)"
Write-Host ""

# Wait for API to be ready
Write-Info "Checking if API is running..."
$MaxRetries = 30
$RetryCount = 0

while ($RetryCount -lt $MaxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "$ApiUrl/" -Method Get -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "API is ready!"
            break
        }
    }
    catch {
        $RetryCount++
        if ($RetryCount -eq $MaxRetries) {
            Write-Error "API did not start within 30 seconds"
            exit 1
        }
        Write-Host "Waiting for API... (attempt $RetryCount/$MaxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

Write-Host ""

# Function to run a test
function Run-Test {
    param(
        [string]$TestName,
        [string]$TestFile,
        [string]$TestDescription
    )
    
    Write-Header $TestName
    Write-Host "Description: $TestDescription" -ForegroundColor Gray
    Write-Host ""
    
    if (-not (Test-Path $TestFile)) {
        Write-Error "Test file not found: $TestFile"
        return $false
    }
    
    $JsonOutput = "$ResultsDir\${TestName}_${Timestamp}.json"
    
    # Run the test
    & k6 run $TestFile `
        --vus 0 `
        --out json=$JsonOutput `
        -e BASE_URL=$ApiUrl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "$TestName passed!"
        Add-Content -Path $ReportFile -Value "`n✅ $TestName : PASSED"
        return $true
    }
    else {
        Write-Error "$TestName failed!"
        Add-Content -Path $ReportFile -Value "`n❌ $TestName : FAILED"
        return $false
    }
}

# Initialize report file
@"
Wasel Palestine - k6 Performance Test Report
Generated: $(Get-Date)
API URL: $ApiUrl

Test Results:
=============
"@ | Out-File -FilePath $ReportFile

# Run API Tests (fastest, run first)
$TotalTests++
if (Run-Test "API-Tests" "tests\k6\apiTests.js" "Functional API tests for all endpoints") {
    $PassedTests++
}
else {
    $FailedTests++
}
Write-Host ""
Start-Sleep -Seconds 2

# Run Load Test
$TotalTests++
if (Run-Test "Load-Test" "tests\k6\loadTest.js" "Sustained load test with 100 concurrent users") {
    $PassedTests++
}
else {
    $FailedTests++
}
Write-Host ""
Start-Sleep -Seconds 5

# Run Stress Test
$TotalTests++
if (Run-Test "Stress-Test" "tests\k6\stressTest.js" "Stress test to find breaking point") {
    $PassedTests++
}
else {
    $FailedTests++
}
Write-Host ""
Start-Sleep -Seconds 5

# Run Soak Test (only if requested)
if ($RunSoak) {
    $TotalTests++
    Write-Warning "Note: Soak test will run for 18 minutes"
    Write-Host ""
    if (Run-Test "Soak-Test" "tests\k6\soakTest.js" "Long-running soak test for stability (18 minutes)") {
        $PassedTests++
    }
    else {
        $FailedTests++
    }
}
else {
    Write-Warning "Skipping Soak Test (use -RunSoak flag to include)"
    Write-Host ""
}

# Print summary
Write-Header "Test Summary"
Write-Host ""
Write-Host "Total Tests:   $TotalTests" -ForegroundColor Cyan
Write-Host "Passed Tests:  " -ForegroundColor Cyan -NoNewline
Write-Host "$PassedTests" -ForegroundColor Green
Write-Host "Failed Tests:  " -ForegroundColor Cyan -NoNewline
Write-Host "$FailedTests" -ForegroundColor Red
Write-Host ""
Write-Info "Results saved to: $ReportFile"
Write-Info "JSON Results:    $ResultsDir"
Write-Host ""

# Add summary to report
@"

Summary
=======
Total Tests: $TotalTests
Passed: $PassedTests
Failed: $FailedTests

Test Files Generated:
"@ | Add-Content -Path $ReportFile

Get-ChildItem "$ResultsDir\*.json" -ErrorAction SilentlyContinue | 
    ForEach-Object { "  - $($_.Name)" } | 
    Add-Content -Path $ReportFile

# Final status
if ($FailedTests -eq 0) {
    Write-Success "All tests passed!"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review the detailed report: $ReportFile"
    Write-Host "2. Check JSON results for detailed metrics: $ResultsDir"
    Write-Host "3. Monitor performance metrics and identify bottlenecks"
    Write-Host ""
    exit 0
}
else {
    Write-Error "Some tests failed. Review the report for details."
    Write-Host ""
    Get-Content $ReportFile
    Write-Host ""
    exit 1
}
