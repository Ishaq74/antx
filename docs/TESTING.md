# ANTX - Test Documentation

This document provides comprehensive information about the test suite for the ANTX authentication system.

## Overview

The ANTX project includes a robust testing strategy with two main types of tests:

1. **Unit Tests (Vitest)** - Testing individual functions and modules
2. **End-to-End Tests (Playwright)** - Testing complete user workflows and security features

## Test Structure

```
├── src/
│   ├── lib/
│   │   ├── security.test.ts       # Security utilities unit tests
│   │   └── smtp.test.ts           # SMTP functionality unit tests
│   └── test-setup.ts              # Vitest configuration and mocks
├── e2e-tests/
│   ├── auth-security.spec.ts      # Authentication E2E tests
│   ├── admin-security.spec.ts     # Admin access control E2E tests
│   └── test-utils.ts              # Shared E2E test utilities
├── vitest.config.ts               # Vitest configuration
├── playwright.config.ts           # Playwright configuration
└── .github/workflows/playwright.yml # CI/CD configuration
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit -- --watch

# Run tests with coverage
npm run test:unit -- --coverage
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- auth-security.spec.ts

# Run tests in specific browser
npm run test:e2e -- --project=chromium
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Unit Tests Coverage

### Security Module (`src/lib/security.test.ts`)

**Email Validation Tests:**
- ✅ Valid email formats
- ✅ Invalid email formats  
- ✅ Email length limits (RFC 5321)
- ✅ Edge cases (single-level domains, double dots)

**Password Validation Tests:**
- ✅ Strong password requirements
- ✅ Minimum/maximum length validation
- ✅ Character requirements (uppercase, lowercase, digits, special)
- ✅ Common weak password detection
- ✅ Multiple validation errors

**Username Validation Tests:**
- ✅ Valid username formats
- ✅ Length restrictions
- ✅ Allowed characters
- ✅ Reserved username detection
- ✅ Special character positioning

**Security Features Tests:**
- ✅ HTML sanitization (XSS prevention)
- ✅ OTP format validation
- ✅ Rate limiting functionality
- ✅ Rate limit cleanup
- ✅ Cross-user rate limiting isolation

### SMTP Module (`src/lib/smtp.test.ts`)

**Connection Testing:**
- ✅ Successful SMTP connection
- ✅ Authentication errors (EAUTH)
- ✅ Timeout errors (ETIMEDOUT)
- ✅ Network errors (ENOTFOUND)
- ✅ Connection refusal (ECONNREFUSED)
- ✅ Configuration validation
- ✅ Unknown error handling

**Email Sending Tests:**
- ✅ Successful email sending
- ✅ Email validation before sending
- ✅ SMTP connection testing before send
- ✅ Email sending error handling
- ✅ Default sender address usage

**Validation Tests:**
- ✅ Recipient validation
- ✅ Subject requirements
- ✅ Content requirements (text or HTML)
- ✅ Subject length limits
- ✅ Content length limits

## End-to-End Tests Coverage

### Authentication Security (`e2e-tests/auth-security.spec.ts`)

**Security Headers:**
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Content-Security-Policy validation
- ✅ Frame-ancestors: none

**Route Protection:**
- ✅ Private route redirects (/dashboard, /profil, /admin, /organisations)
- ✅ Public route access (/, /contact, /about)
- ✅ Authentication page access (/connexion, /inscription, /mot-de-passe-oublie)
- ✅ Redirect parameter preservation

**Form Security:**
- ✅ Login form display and security
- ✅ Registration form display and security
- ✅ Password reset form display and security
- ✅ Email format validation
- ✅ Password strength validation
- ✅ CSRF protection detection

**Authentication Flows:**
- ✅ Invalid credential handling
- ✅ Password reset functionality
- ✅ Rate limiting on failed attempts

**Content Security:**
- ✅ XSS prevention in form inputs
- ✅ URL parameter sanitization
- ✅ Script injection prevention

**Responsive & Accessibility:**
- ✅ Mobile device compatibility
- ✅ Keyboard navigation
- ✅ Form labeling
- ✅ Focus management

### Admin Security (`e2e-tests/admin-security.spec.ts`)

**Access Control:**
- ✅ Unauthenticated user blocking
- ✅ Admin API endpoint protection
- ✅ Admin route protection
- ✅ Role-based access validation

**Security Headers:**
- ✅ Security headers on admin pages
- ✅ Clickjacking prevention
- ✅ Strict CSP enforcement

**Data Protection:**
- ✅ Sensitive admin API protection
- ✅ robots.txt admin path disallow
- ✅ Error information sanitization

**Session Security:**
- ✅ Secure session cookie handling
- ✅ Session timeout handling
- ✅ Logout functionality

**Error Handling:**
- ✅ Graceful error responses
- ✅ Sensitive information protection
- ✅ Appropriate HTTP status codes

## Test Utilities

The `e2e-tests/test-utils.ts` file provides reusable functions for:

### Security Testing
- `checkSecurityHeaders()` - Validates all security headers
- `checkCSPProtection()` - Validates Content Security Policy
- `testFormSecurity()` - Tests CSRF protection and XSS prevention

### Authentication Testing
- `testLogin()` - Tests login flow
- `testRegistration()` - Tests registration flow
- `testRouteProtection()` - Tests route access control
- `testAdminAccess()` - Tests admin-specific access control

### Validation Testing
- `testPasswordValidation()` - Tests password strength requirements
- `testEmailValidation()` - Tests email format validation
- `testRateLimit()` - Tests rate limiting functionality

### UX Testing
- `testMobileResponsive()` - Tests mobile compatibility
- `testAccessibility()` - Tests accessibility features

### Test Data
- `testUsers` - Mock user data for testing
- `weakPasswords` - Common weak passwords for validation testing
- `invalidEmails` - Invalid email formats for validation testing
- `xssPayloads` - XSS attack vectors for security testing

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/playwright.yml`) includes:

### Unit Test Job
- Runs Vitest unit tests
- Uploads test coverage reports
- Fast feedback on code changes

### E2E Test Job
- Installs Playwright browsers
- Starts development server
- Runs comprehensive E2E tests
- Uploads test reports and screenshots

### Security Test Job
- Runs security audits
- Performs type checking
- Validates all tests pass

## Test Environment Configuration

### Vitest Configuration
- **Environment**: Node.js
- **Test Files**: `src/**/*.{test,spec}.{js,ts}`
- **Excluded**: `tests/**`, `e2e-tests/**`, `node_modules/**`
- **Setup**: Global test utilities and mocks

### Playwright Configuration
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: `http://localhost:4321`
- **Test Directory**: `./e2e-tests`
- **Dev Server**: Automatic startup
- **Retries**: 2 on CI, 0 locally
- **Parallel**: True (faster execution)

## Best Practices

### Unit Tests
1. **Mock External Dependencies** - SMTP, databases, external APIs
2. **Test Edge Cases** - Empty inputs, boundary values, error conditions
3. **Validate Security** - Input sanitization, validation logic
4. **Fast Execution** - Unit tests should run quickly
5. **Isolated** - Each test should be independent

### E2E Tests
1. **Clear Test Data** - Reset sessions between tests
2. **Test Real Scenarios** - Complete user workflows
3. **Security Focus** - Headers, redirects, access control
4. **Cross-Browser** - Test in multiple browsers
5. **Mobile Testing** - Responsive design validation

### Security Testing
1. **Comprehensive Coverage** - All auth flows and admin functions
2. **Attack Simulation** - XSS, CSRF, injection attempts
3. **Header Validation** - All security headers present
4. **Access Control** - Role-based restrictions
5. **Data Protection** - No sensitive information leakage

## Troubleshooting

### Common Issues

**Unit Tests Failing:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run test:unit
```

**E2E Tests Failing:**
```bash
# Reinstall browsers
npx playwright install --with-deps
npm run test:e2e
```

**CI/CD Issues:**
- Check Node.js version compatibility
- Verify environment variables are set
- Review test timeout settings
- Check browser installation in CI

### Debugging Tests

**Unit Test Debugging:**
```bash
# Run specific test file
npm run test:unit -- src/lib/security.test.ts

# Debug with verbose output
npm run test:unit -- --reporter=verbose

# Run in watch mode
npm run test:unit -- --watch
```

**E2E Test Debugging:**
```bash
# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Debug specific test
npm run test:e2e -- --debug auth-security.spec.ts

# Generate test report
npm run test:e2e -- --reporter=html
```

## Security Compliance

The test suite ensures compliance with:

- **OWASP Top 10** - Protection against common vulnerabilities
- **GDPR** - Data protection and privacy
- **RFC Standards** - Email validation, security headers
- **Web Security** - CSP, HSTS, clickjacking prevention
- **Authentication Security** - Session management, rate limiting

## Monitoring and Reporting

### Test Reports
- Unit test coverage reports
- E2E test execution reports
- Security audit results
- Performance metrics

### Alerts
- Test failures in CI/CD
- Security vulnerability detection
- Performance regression alerts
- Coverage threshold violations

This comprehensive test suite ensures the ANTX authentication system is secure, reliable, and maintainable.