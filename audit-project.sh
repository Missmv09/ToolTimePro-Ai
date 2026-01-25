#!/bin/bash

# ToolTimePro Project Audit Script
# Comprehensive audit of the project structure, dependencies, and code quality

echo "=============================================="
echo "  ToolTimePro Project Audit"
echo "  $(date)"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
WARNINGS=0
ERRORS=0
INFO=0

# Helper functions
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((ERRORS++))
}

print_info() {
    echo -e "  $1"
    ((INFO++))
}

# ============================================
# 1. PROJECT STRUCTURE AUDIT
# ============================================
print_section "1. PROJECT STRUCTURE AUDIT"

echo ""
echo "Project Root Contents:"
ls -la

echo ""
echo "Key directories:"
for dir in app src components lib pages api public prisma; do
    if [ -d "$dir" ]; then
        file_count=$(find "$dir" -type f 2>/dev/null | wc -l)
        print_success "$dir/ exists ($file_count files)"
    else
        print_info "$dir/ not found"
    fi
done

# ============================================
# 2. PACKAGE.JSON ANALYSIS
# ============================================
print_section "2. PACKAGE.JSON ANALYSIS"

if [ -f "package.json" ]; then
    print_success "package.json found"

    echo ""
    echo "Project Info:"
    node -e "const p = require('./package.json'); console.log('  Name:', p.name); console.log('  Version:', p.version);" 2>/dev/null || echo "  Unable to parse package.json"

    echo ""
    echo "Scripts available:"
    node -e "const p = require('./package.json'); Object.keys(p.scripts || {}).forEach(s => console.log('  -', s));" 2>/dev/null

    echo ""
    echo "Dependencies count:"
    deps=$(node -e "const p = require('./package.json'); console.log(Object.keys(p.dependencies || {}).length);" 2>/dev/null)
    devDeps=$(node -e "const p = require('./package.json'); console.log(Object.keys(p.devDependencies || {}).length);" 2>/dev/null)
    print_info "Production dependencies: $deps"
    print_info "Dev dependencies: $devDeps"
else
    print_error "package.json not found!"
fi

# ============================================
# 3. ENVIRONMENT CONFIGURATION AUDIT
# ============================================
print_section "3. ENVIRONMENT CONFIGURATION"

echo ""
echo "Environment files:"
for env_file in .env .env.local .env.development .env.production .env.example; do
    if [ -f "$env_file" ]; then
        print_success "$env_file exists"
    else
        if [ "$env_file" = ".env.example" ]; then
            print_warning "$env_file not found (recommended for documentation)"
        else
            print_info "$env_file not present"
        fi
    fi
done

# Check .gitignore for env files
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        print_success ".env files are in .gitignore"
    else
        print_error ".env files may not be in .gitignore - SECURITY RISK!"
    fi
fi

# ============================================
# 4. DEPENDENCY SECURITY AUDIT
# ============================================
print_section "4. DEPENDENCY SECURITY AUDIT"

if [ -f "package-lock.json" ] || [ -f "yarn.lock" ]; then
    echo ""
    echo "Running npm audit..."
    npm audit --audit-level=moderate 2>&1 || true
else
    print_warning "No lock file found. Run 'npm install' to generate package-lock.json"
fi

# ============================================
# 5. CODE QUALITY CHECKS
# ============================================
print_section "5. CODE QUALITY CHECKS"

# ESLint
echo ""
echo "ESLint Check:"
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc" ]; then
    print_success "ESLint configuration found"
    echo ""
    echo "Running ESLint..."
    npm run lint 2>&1 || true
else
    print_warning "No ESLint configuration found"
fi

# TypeScript
echo ""
echo "TypeScript Check:"
if [ -f "tsconfig.json" ]; then
    print_success "TypeScript configuration found"
    echo ""
    echo "Checking TypeScript types..."
    npx tsc --noEmit 2>&1 || true
else
    print_info "No TypeScript configuration found"
fi

# ============================================
# 6. NEXT.JS CONFIGURATION AUDIT
# ============================================
print_section "6. NEXT.JS CONFIGURATION"

if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
    print_success "Next.js configuration found"

    # Check for common Next.js config issues
    config_file=$(ls next.config.* 2>/dev/null | head -1)
    if [ -n "$config_file" ]; then
        echo ""
        echo "Configuration preview:"
        head -30 "$config_file"
    fi
else
    print_warning "No Next.js configuration file found"
fi

# ============================================
# 7. DATABASE/PRISMA AUDIT
# ============================================
print_section "7. DATABASE/PRISMA AUDIT"

if [ -d "prisma" ]; then
    print_success "Prisma directory found"

    if [ -f "prisma/schema.prisma" ]; then
        print_success "Prisma schema found"

        echo ""
        echo "Schema models:"
        grep -E "^model " prisma/schema.prisma 2>/dev/null || echo "  No models found"
    else
        print_warning "prisma/schema.prisma not found"
    fi
else
    print_info "Prisma not configured in this project"
fi

# ============================================
# 8. API ROUTES AUDIT
# ============================================
print_section "8. API ROUTES AUDIT"

echo ""
echo "API Routes:"
if [ -d "app/api" ]; then
    print_success "App Router API routes found"
    find app/api -name "route.ts" -o -name "route.js" 2>/dev/null | while read -r route; do
        print_info "  $route"
    done
elif [ -d "pages/api" ]; then
    print_success "Pages Router API routes found"
    find pages/api -name "*.ts" -o -name "*.js" 2>/dev/null | while read -r route; do
        print_info "  $route"
    done
else
    print_info "No API routes directory found"
fi

# ============================================
# 9. BUILD TEST
# ============================================
print_section "9. BUILD TEST"

echo ""
echo "Attempting build..."
if npm run build 2>&1; then
    print_success "Build completed successfully"
else
    print_error "Build failed - see errors above"
fi

# ============================================
# 10. FILE SIZE ANALYSIS
# ============================================
print_section "10. FILE SIZE ANALYSIS"

echo ""
echo "Largest files in the project:"
find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" -exec du -h {} + 2>/dev/null | sort -rh | head -10

echo ""
echo "Directory sizes (excluding node_modules, .git, .next):"
du -sh */ 2>/dev/null | grep -v node_modules | grep -v ".git" | sort -rh | head -10

# ============================================
# SUMMARY
# ============================================
print_section "AUDIT SUMMARY"

echo ""
echo "=============================================="
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}  Errors: $ERRORS${NC}"
fi
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}  Warnings: $WARNINGS${NC}"
fi
echo -e "${GREEN}  Checks completed${NC}"
echo "=============================================="
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Please address the errors above before deploying.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Consider addressing the warnings above.${NC}"
    exit 0
else
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
fi
