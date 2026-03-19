# Add Dark Mode Toggle

## Description
Implement a dark mode toggle in the application header that allows users to switch between light and dark themes.

## Requirements
- [ ] Add toggle button in the main navigation header
- [ ] Persist theme preference in localStorage
- [ ] Apply theme consistently across all components
- [ ] Include smooth transitions between themes
- [ ] Support system preference detection

## Acceptance Criteria
- Toggle button is visually appealing and accessible
- Theme persists across browser sessions
- All text and UI elements are readable in both modes
- Transitions are smooth (≤300ms)
- System theme is detected on first visit

## Context
Users have requested dark mode support for better accessibility and reduced eye strain during extended use.

## Files to Modify
- `src/components/Header.tsx`
- `src/hooks/useTheme.ts`
- `src/styles/themes.css`
- `src/context/ThemeProvider.tsx`

## Design Notes
- Use CSS custom properties for theme variables
- Follow existing color palette conventions
- Ensure WCAG contrast compliance
- Match design system patterns

## Priority
Medium - Nice to have feature that improves user experience