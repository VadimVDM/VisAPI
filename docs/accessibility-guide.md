# Accessibility Implementation Guide

## Overview

This document outlines the accessibility improvements implemented in VisAPI as part of Sprint 4 to achieve ≥90% Lighthouse accessibility score compliance with WCAG 2.1 AA standards.

## Implemented Accessibility Features

### 1. Semantic HTML Structure

**Root Layout (`apps/frontend/src/app/layout.tsx`)**
- ✅ HTML lang attribute set to "en"
- ✅ Viewport meta tag for responsive design
- ✅ Proper title and description metadata

**Dashboard Layout (`components/ui/DashboardLayout.tsx`)**
- ✅ Skip link for keyboard navigation
- ✅ Proper main landmark with ID
- ✅ Loading state with proper ARIA attributes
- ✅ Focus management between authentication states

### 2. Navigation and Landmarks

**Header Component (`components/ui/Header.tsx`)**
- ✅ Search input with proper labels and ARIA attributes
- ✅ Role="search" for search container
- ✅ Notification button with accessible name and description
- ✅ ARIA-hidden decorative icons
- ✅ Screen reader text for notification count

**Sidebar Component (`components/ui/Sidebar.tsx`)**
- ✅ Proper navigation landmark with aria-label
- ✅ aria-current="page" for active navigation items
- ✅ Confirmation dialog for sign out action
- ✅ Accessible names for all interactive elements
- ✅ Proper focus management with visible focus indicators

### 3. Forms and Input Accessibility

**Login Form (`components/auth/LoginForm.tsx`)**
- ✅ Proper form landmark with aria-labelledby
- ✅ Email input with proper labels and validation
- ✅ aria-invalid for error states
- ✅ aria-describedby for form validation messages
- ✅ Live regions for status and error messages
- ✅ Loading state announcements for screen readers

### 4. Focus Management

**Focus Indicators**
- ✅ Visible focus rings on all interactive elements
- ✅ Proper focus outline colors (primary-500 with offset)
- ✅ Focus management in modal dialogs
- ✅ Skip link that appears on focus

**Keyboard Navigation**
- ✅ Tab order follows logical flow
- ✅ All interactive elements are keyboard accessible
- ✅ Focus trapping in modal dialogs
- ✅ Escape key handling for modals

### 5. ARIA Attributes and Screen Reader Support

**ARIA Labels and Descriptions**
- ✅ aria-label for buttons without visible text
- ✅ aria-describedby for form help text
- ✅ aria-labelledby for form groupings
- ✅ aria-current for navigation state
- ✅ aria-hidden for decorative elements

**Live Regions**
- ✅ aria-live="polite" for status messages
- ✅ role="alert" for error messages
- ✅ role="status" for loading states
- ✅ aria-atomic for complete message reading

### 6. Color and Contrast

**Color Accessibility**
- ✅ Primary colors meet WCAG AA contrast ratios
- ✅ Error and success states have adequate contrast
- ✅ Focus indicators are clearly visible
- ✅ Text colors meet minimum contrast requirements

**Visual Indicators**
- ✅ Information conveyed through color also has text/icons
- ✅ Focus states visible for all interactive elements
- ✅ Active states clearly indicated
- ✅ Hover states provide visual feedback

## Lighthouse CI Configuration

### Enhanced Configuration (`.lighthouserc.json`)

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm nx serve frontend",
      "startServerReadyPattern": "ready on",
      "url": [
        "http://localhost:3001/",
        "http://localhost:3001/login",
        "http://localhost:3001/dashboard",
        "http://localhost:3001/dashboard/workflows",
        "http://localhost:3001/dashboard/logs",
        "http://localhost:3001/dashboard/api-keys",
        "http://localhost:3001/dashboard/queue"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["accessibility", "best-practices"],
        "skipAudits": ["uses-http2"]
      }
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "color-contrast": ["error", { "minScore": 0.9 }],
        "heading-order": ["error", { "minScore": 0.9 }],
        "label": ["error", { "minScore": 0.9 }],
        "link-name": ["error", { "minScore": 0.9 }],
        "button-name": ["error", { "minScore": 0.9 }],
        "aria-valid-attr": ["error", { "minScore": 0.9 }],
        "aria-required-attr": ["error", { "minScore": 0.9 }],
        "form-field-multiple-labels": ["error", { "minScore": 0.9 }],
        "image-alt": ["error", { "minScore": 0.9 }],
        "landmark-one-main": ["error", { "minScore": 0.9 }],
        "focus-traps": ["error", { "minScore": 0.9 }],
        "keyboard-navigation": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

### Scripts Added to `package.json`

```json
{
  "scripts": {
    "lighthouse:accessibility": "lhci autorun --config=.lighthouserc.json",
    "lighthouse:accessibility:ci": "lhci autorun --upload.target=temporary-public-storage",
    "test:accessibility": "pnpm lighthouse:accessibility"
  }
}
```

## ESLint Accessibility Configuration

### JSX A11Y Rules (`eslint.config.js`)

```javascript
...compat.config({
  files: ['**/*.jsx', '**/*.tsx'],
  extends: ['plugin:jsx-a11y/recommended'],
  rules: {
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/interactive-supports-focus': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/mouse-events-have-key-events': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': 'error',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
  },
})
```

## Testing Strategy

### 1. Automated Testing

**Lighthouse CI Testing**
```bash
# Run accessibility tests locally
pnpm test:accessibility

# Run with CI configuration
pnpm lighthouse:accessibility:ci
```

**ESLint Accessibility Testing**
```bash
# Run accessibility linting
pnpm lint

# Run linting for specific files
pnpm lint apps/frontend/src/components/ui/Header.tsx
```

### 2. Manual Testing

**Keyboard Navigation Testing**
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test skip links functionality
- [ ] Verify modal focus trapping
- [ ] Test form submission with keyboard

**Screen Reader Testing**
- [ ] Test with VoiceOver (macOS) or JAWS (Windows)
- [ ] Verify all content is announced correctly
- [ ] Test form validation announcements
- [ ] Verify navigation structure is clear
- [ ] Test live region announcements

**Color Contrast Testing**
- [ ] Use WebAIM Contrast Checker
- [ ] Test with high contrast mode
- [ ] Verify color-blind accessibility
- [ ] Test focus indicators visibility

### 3. Browser Testing

**Supported Browsers**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Screen Reader Compatibility**
- VoiceOver (macOS/iOS)
- JAWS (Windows)
- NVDA (Windows)
- TalkBack (Android)

## Accessibility Checklist

### Pre-Deployment Checklist

**Structure and Semantics**
- [ ] HTML lang attribute set
- [ ] Viewport meta tag present
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Semantic HTML elements used
- [ ] Skip links implemented
- [ ] Main landmark present

**Navigation and Interaction**
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] aria-current for navigation
- [ ] Confirmation dialogs for destructive actions

**Forms and Inputs**
- [ ] All inputs have labels
- [ ] Form validation accessible
- [ ] Error messages associated with fields
- [ ] Required fields marked
- [ ] Instructions provided

**Images and Media**
- [ ] All images have alt text
- [ ] Decorative images marked aria-hidden
- [ ] Complex images have descriptions
- [ ] Icons have accessible names

**Color and Contrast**
- [ ] Text contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Information not conveyed by color alone
- [ ] Error states have adequate contrast

**Dynamic Content**
- [ ] Live regions for status updates
- [ ] Loading states announced
- [ ] Modal dialogs accessible
- [ ] Dynamic content updates announced

### Post-Deployment Validation

**Lighthouse Accessibility Score**
- [ ] Score ≥90% on all tested pages
- [ ] No accessibility violations
- [ ] Best practices score ≥90%
- [ ] All assertions passing

**Manual Validation**
- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Color contrast adequate
- [ ] Focus management proper

## Maintenance

### Regular Accessibility Reviews

**Monthly Reviews**
- Run Lighthouse accessibility audits
- Review new components for accessibility
- Update accessibility documentation
- Train team on accessibility best practices

**Quarterly Reviews**
- Comprehensive manual testing
- Update accessibility guidelines
- Review and update ESLint rules
- Assess new accessibility tools

### Continuous Improvement

**Monitoring**
- Lighthouse CI in deployment pipeline
- ESLint accessibility rules enforced
- Regular accessibility testing
- User feedback on accessibility

**Updates**
- Stay current with WCAG guidelines
- Update dependencies with accessibility fixes
- Improve based on user feedback
- Regular team training on accessibility

## Resources

### Tools and References

**Testing Tools**
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)

**Documentation**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11Y Project](https://www.a11yproject.com/)

**Screen Readers**
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [JAWS Documentation](https://www.freedomscientific.com/products/software/jaws/)
- [NVDA User Guide](https://www.nvaccess.org/about-nvda/)

---

**Last Updated**: July 16, 2025
**Version**: Sprint 4 Accessibility Implementation
**Status**: Implemented - Ready for Testing