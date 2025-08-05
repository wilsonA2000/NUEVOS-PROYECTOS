# VeriHome Dependencies Installation Script
# PowerShell script to install all project dependencies with error handling

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-VirtualEnv {
    # Check if we're in a virtual environment
    if (-not $env:VIRTUAL_ENV) {
        Write-ColorOutput "ERROR: No virtual environment detected!" $ErrorColor
        Write-ColorOutput "Please activate your virtual environment first:" $WarningColor
        Write-ColorOutput "  - On Windows: venv\Scripts\Activate.ps1" $InfoColor
        Write-ColorOutput "  - On Unix/Mac: source venv/bin/activate" $InfoColor
        return $false
    }
    Write-ColorOutput "✓ Virtual environment detected: $env:VIRTUAL_ENV" $SuccessColor
    return $true
}

function Test-PythonVersion {
    try {
        $pythonVersion = python --version 2>&1
        Write-ColorOutput "✓ Python version: $pythonVersion" $SuccessColor
        
        # Extract version number and check if it's 3.12
        if ($pythonVersion -match "3\.12") {
            Write-ColorOutput "✓ Python 3.12 detected - using compatible package versions" $SuccessColor
            return "3.12"
        } elseif ($pythonVersion -match "3\.11") {
            Write-ColorOutput "✓ Python 3.11 detected" $SuccessColor
            return "3.11"
        } elseif ($pythonVersion -match "3\.10") {
            Write-ColorOutput "✓ Python 3.10 detected" $SuccessColor
            return "3.10"
        } else {
            Write-ColorOutput "WARNING: Python version may not be fully compatible" $WarningColor
            return "other"
        }
    } catch {
        Write-ColorOutput "ERROR: Could not determine Python version" $ErrorColor
        return "unknown"
    }
}

function Update-Pip {
    Write-ColorOutput "`nUpdating pip to latest version..." $InfoColor
    try {
        python -m pip install --upgrade pip setuptools wheel
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✓ Pip updated successfully" $SuccessColor
        } else {
            throw "Pip update failed"
        }
    } catch {
        Write-ColorOutput "ERROR: Failed to update pip" $ErrorColor
        if (-not $Force) {
            exit 1
        }
    }
}

function Install-Package {
    param(
        [string]$Package,
        [string]$Description = "",
        [bool]$Critical = $true
    )
    
    $displayName = if ($Description) { $Description } else { $Package }
    Write-ColorOutput "`nInstalling $displayName..." $InfoColor
    
    try {
        $output = python -m pip install $Package 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✓ $displayName installed successfully" $SuccessColor
            return $true
        } else {
            throw "Installation failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-ColorOutput "ERROR: Failed to install $displayName" $ErrorColor
        Write-ColorOutput "Error details: $_" $ErrorColor
        
        if ($Critical -and -not $Force) {
            Write-ColorOutput "This is a critical package. Use -Force to continue anyway." $WarningColor
            exit 1
        }
        return $false
    }
}

function Install-CoreDependencies {
    Write-ColorOutput "`n=== Installing Core Django Dependencies ===" $InfoColor
    
    $coreDeps = @(
        @{Package="Django==4.2.7"; Description="Django Framework"; Critical=$true},
        @{Package="djangorestframework==3.14.0"; Description="Django REST Framework"; Critical=$true},
        @{Package="django-cors-headers==4.3.0"; Description="CORS Headers"; Critical=$true},
        @{Package="python-decouple==3.8"; Description="Environment Configuration"; Critical=$true},
        @{Package="Pillow==10.1.0"; Description="Image Processing"; Critical=$true},
        @{Package="psycopg2-binary==2.9.9"; Description="PostgreSQL Adapter"; Critical=$false}
    )
    
    foreach ($dep in $coreDeps) {
        Install-Package -Package $dep.Package -Description $dep.Description -Critical $dep.Critical
    }
}

function Install-AuthDependencies {
    Write-ColorOutput "`n=== Installing Authentication Dependencies ===" $InfoColor
    
    $authDeps = @(
        @{Package="djangorestframework-simplejwt==5.3.0"; Description="JWT Authentication"; Critical=$true},
        @{Package="django-allauth==0.57.0"; Description="Django Allauth"; Critical=$true},
        @{Package="PyJWT==2.8.0"; Description="JWT Library"; Critical=$true},
        @{Package="cryptography==41.0.7"; Description="Cryptography Library"; Critical=$true}
    )
    
    foreach ($dep in $authDeps) {
        Install-Package -Package $dep.Package -Description $dep.Description -Critical $dep.Critical
    }
}

function Install-CeleryDependencies {
    param([string]$PythonVersion)
    
    Write-ColorOutput "`n=== Installing Celery and Redis Dependencies ===" $InfoColor
    
    # For Python 3.12, we need specific versions
    if ($PythonVersion -eq "3.12") {
        Write-ColorOutput "Installing Celery with Python 3.12 compatibility..." $InfoColor
        
        # Install dependencies in specific order for Python 3.12
        Install-Package -Package "redis==5.0.1" -Description "Redis Python Client" -Critical=$false
        Install-Package -Package "celery==5.3.4" -Description "Celery Task Queue" -Critical=$false
        Install-Package -Package "django-celery-beat==2.5.0" -Description="Celery Beat Scheduler" -Critical=$false
        Install-Package -Package "django-celery-results==2.5.1" -Description="Celery Results Backend" -Critical=$false
        
        # Flower might have issues with Python 3.12
        $flowerInstalled = Install-Package -Package "flower==2.0.1" -Description="Celery Monitoring" -Critical=$false
        if (-not $flowerInstalled) {
            Write-ColorOutput "Trying alternative Flower installation..." $WarningColor
            Install-Package -Package "flower" -Description="Celery Monitoring (latest)" -Critical=$false
        }
    } else {
        # Standard installation for other Python versions
        Install-Package -Package "celery==5.3.4" -Description="Celery Task Queue" -Critical=$false
        Install-Package -Package "redis==5.0.1" -Description="Redis Python Client" -Critical=$false
        Install-Package -Package "django-celery-beat==2.5.0" -Description="Celery Beat Scheduler" -Critical=$false
        Install-Package -Package "django-celery-results==2.5.1" -Description="Celery Results Backend" -Critical=$false
        Install-Package -Package "flower==2.0.1" -Description="Celery Monitoring" -Critical=$false
    }
}

function Install-MonitoringDependencies {
    Write-ColorOutput "`n=== Installing Monitoring and Logging Dependencies ===" $InfoColor
    
    # Try to install sentry-sdk
    $sentryInstalled = Install-Package -Package "sentry-sdk==1.39.1" -Description="Sentry Error Tracking" -Critical=$false
    if (-not $sentryInstalled) {
        Write-ColorOutput "Trying latest sentry-sdk version..." $WarningColor
        Install-Package -Package "sentry-sdk" -Description="Sentry Error Tracking (latest)" -Critical=$false
    }
    
    # Other monitoring tools
    Install-Package -Package "django-debug-toolbar==4.2.0" -Description="Debug Toolbar" -Critical=$false
    Install-Package -Package "django-extensions==3.2.3" -Description="Django Extensions" -Critical=$false
}

function Install-UtilityDependencies {
    Write-ColorOutput "`n=== Installing Utility Dependencies ===" $InfoColor
    
    $utilDeps = @(
        @{Package="requests==2.31.0"; Description="HTTP Library"; Critical=$true},
        @{Package="python-dateutil==2.8.2"; Description="Date Utilities"; Critical=$true},
        @{Package="django-filter==23.3"; Description="Django Filters"; Critical=$true},
        @{Package="drf-yasg==1.21.7"; Description="API Documentation"; Critical=$false},
        @{Package="django-storages==1.14.2"; Description="Storage Backends"; Critical=$false},
        @{Package="boto3==1.29.7"; Description="AWS SDK"; Critical=$false},
        @{Package="whitenoise==6.6.0"; Description="Static File Serving"; Critical=$true},
        @{Package="gunicorn==21.2.0"; Description="WSGI Server"; Critical=$false},
        @{Package="daphne==4.0.0"; Description="ASGI Server"; Critical=$false},
        @{Package="channels==4.0.0"; Description="WebSocket Support"; Critical=$false},
        @{Package="channels-redis==4.1.0"; Description="Channels Redis Backend"; Critical=$false}
    )
    
    foreach ($dep in $utilDeps) {
        Install-Package -Package $dep.Package -Description $dep.Description -Critical $dep.Critical
    }
}

function Install-TestingDependencies {
    Write-ColorOutput "`n=== Installing Testing Dependencies ===" $InfoColor
    
    $testDeps = @(
        @{Package="pytest==7.4.3"; Description="PyTest Framework"; Critical=$false},
        @{Package="pytest-django==4.7.0"; Description="PyTest Django Plugin"; Critical=$false},
        @{Package="coverage==7.3.2"; Description="Code Coverage"; Critical=$false},
        @{Package="factory-boy==3.3.0"; Description="Test Factories"; Critical=$false},
        @{Package="faker==20.1.0"; Description="Fake Data Generator"; Critical=$false}
    )
    
    foreach ($dep in $testDeps) {
        Install-Package -Package $dep.Package -Description $dep.Description -Critical $dep.Critical
    }
}

function Install-EmailDependencies {
    Write-ColorOutput "`n=== Installing Email Dependencies ===" $InfoColor
    
    Install-Package -Package "django-anymail==10.2" -Description="Email Service Integration" -Critical=$false
    Install-Package -Package "sendgrid==6.11.0" -Description="SendGrid Email Service" -Critical=$false
}

function Install-PaymentDependencies {
    Write-ColorOutput "`n=== Installing Payment Processing Dependencies ===" $InfoColor
    
    Install-Package -Package "stripe==7.8.0" -Description="Stripe Payment Gateway" -Critical=$false
    Install-Package -Package "django-payments==2.0.0" -Description="Django Payments" -Critical=$false
}

function Install-SecurityDependencies {
    Write-ColorOutput "`n=== Installing Security Dependencies ===" $InfoColor
    
    $securityDeps = @(
        @{Package="django-ratelimit==4.1.0"; Description="Rate Limiting"; Critical=$false},
        @{Package="django-csp==3.7"; Description="Content Security Policy"; Critical=$false},
        @{Package="django-environ==0.11.2"; Description="Environment Variables"; Critical=$false},
        @{Package="python-dotenv==1.0.0"; Description="Dotenv Support"; Critical=$false}
    )
    
    foreach ($dep in $securityDeps) {
        Install-Package -Package $dep.Package -Description $dep.Description -Critical $dep.Critical
    }
}

function Save-RequirementsFile {
    Write-ColorOutput "`n=== Generating requirements.txt ===" $InfoColor
    
    try {
        python -m pip freeze > requirements.txt
        Write-ColorOutput "✓ requirements.txt file generated successfully" $SuccessColor
    } catch {
        Write-ColorOutput "WARNING: Could not generate requirements.txt" $WarningColor
    }
}

function Show-Summary {
    Write-ColorOutput "`n=== Installation Summary ===" $InfoColor
    Write-ColorOutput "Installation process completed!" $SuccessColor
    
    Write-ColorOutput "`nNext steps:" $InfoColor
    Write-ColorOutput "1. Check for any error messages above" $WarningColor
    Write-ColorOutput "2. Run 'python manage.py migrate' to apply database migrations" $InfoColor
    Write-ColorOutput "3. Run 'python manage.py collectstatic' to collect static files" $InfoColor
    Write-ColorOutput "4. Create a superuser with 'python manage.py createsuperuser'" $InfoColor
    Write-ColorOutput "5. Start the development server with 'python manage.py runserver'" $InfoColor
    
    if (Test-Path "requirements.txt") {
        Write-ColorOutput "`n✓ requirements.txt has been updated with all installed packages" $SuccessColor
    }
}

# Main execution
function Main {
    Write-ColorOutput "=== VeriHome Dependencies Installation Script ===" $InfoColor
    Write-ColorOutput "This script will install all required dependencies for the VeriHome project" $InfoColor
    
    if ($Force) {
        Write-ColorOutput "Running in FORCE mode - will continue on errors" $WarningColor
    }
    
    if ($Verbose) {
        $VerbosePreference = "Continue"
    }
    
    # Check virtual environment
    if (-not (Test-VirtualEnv)) {
        exit 1
    }
    
    # Check Python version
    $pythonVersion = Test-PythonVersion
    
    # Update pip first
    Update-Pip
    
    # Install dependencies in order
    Install-CoreDependencies
    Install-AuthDependencies
    Install-CeleryDependencies -PythonVersion $pythonVersion
    Install-MonitoringDependencies
    Install-UtilityDependencies
    Install-EmailDependencies
    Install-PaymentDependencies
    Install-SecurityDependencies
    Install-TestingDependencies
    
    # Generate requirements.txt
    Save-RequirementsFile
    
    # Show summary
    Show-Summary
}

# Run the main function
Main