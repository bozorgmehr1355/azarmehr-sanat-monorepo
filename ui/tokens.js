/* ui/tokens.js — Shared design tokens as a browser global (Phase 0 foundation).
   Mirror of ui/tokens.css. No runtime logic, no UI. ASCII-only.
   Attaches window.UI_TOKENS for no-bundler / UMD apps (admin-panel, wholesale-portal).
   messenger-app may also read window.UI_TOKENS or import an equivalent module.
   Keep values synchronized with ui/tokens.css and bump version together. */
(function () {
  'use strict';

  var UI_TOKENS = {
    version: '0.1.0',

    color: {
      brand: '#D4880E',
      brandContrast: '#1A1205',
      success: '#1F9D55',
      warning: '#E0A106',
      danger: '#D64545',
      info: '#2F80C2',
      bg: '#0F0F0F',
      surface: '#1A1A1A',
      surface2: '#242424',
      text: '#F5F5F5',
      textMuted: '#9AA0A6',
      border: '#333333',
      focus: '#7CC4FF'
    },

    font: {
      family: "'IRANSans', 'Vazirmatn', Tahoma, sans-serif",
      sizeXs: '12px',
      sizeSm: '14px',
      sizeMd: '16px',
      sizeLg: '18px',
      sizeXl: '22px',
      size2xl: '28px',
      lineHeightTight: '1.25',
      lineHeightBase: '1.5',
      weightRegular: 400,
      weightMedium: 500,
      weightBold: 700
    },

    space: {
      s1: '4px',
      s2: '8px',
      s3: '12px',
      s4: '16px',
      s5: '24px',
      s6: '32px',
      s7: '48px',
      s8: '64px'
    },

    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      pill: '999px'
    },

    shadow: {
      s1: '0 1px 2px rgba(0, 0, 0, 0.4)',
      s2: '0 2px 8px rgba(0, 0, 0, 0.5)',
      s3: '0 8px 24px rgba(0, 0, 0, 0.55)',
      focus: '0 0 0 3px #7CC4FF'
    },

    z: {
      base: 0,
      sticky: 100,
      drawer: 200,
      modal: 300,
      toast: 400,
      tooltip: 500
    },

    motion: {
      fast: '120ms',
      base: '200ms',
      slow: '320ms',
      easing: 'cubic-bezier(0.2, 0, 0.2, 1)'
    },

    layout: {
      breakpointSm: '480px',
      breakpointMd: '768px',
      breakpointLg: '1024px',
      containerMax: '1200px',
      sidebarWidth: '240px'
    },

    focusRing: {
      width: '3px',
      color: '#7CC4FF',
      value: '0 0 0 3px #7CC4FF'
    }
  };

  if (typeof window !== 'undefined') {
    window.UI_TOKENS = UI_TOKENS;
  }
  if (typeof global !== 'undefined') {
    global.UI_TOKENS = UI_TOKENS;
  }
})();
