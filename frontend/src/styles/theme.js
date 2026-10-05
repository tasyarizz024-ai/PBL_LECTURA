/**
 * LECTURA Design System Theme & Style Guide
 * Diekstrak langsung dari referensi Stitch (stitch-login-reference.html)
 * dan dikonfirmasi dengan visual screenshot Portal Mahasiswa & Admin.
 */

export const colors = {
  // Brand Primary (Royal Indigo / Blue)
  primary: '#4648d4',
  primaryContainer: '#6063ee',
  primaryFixed: '#e1e0ff',
  primaryFixedDim: '#c0c1ff',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#fffbff',
  onPrimaryFixed: '#07006c',
  onPrimaryFixedVariant: '#2f2ebe',
  inversePrimary: '#c0c1ff',

  // Secondary (Vibrant Purple / Violet)
  secondary: '#6b38d4',
  secondaryContainer: '#8455ef',
  secondaryFixed: '#e9ddff',
  secondaryFixedDim: '#d0bcff',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#fffbff',
  onSecondaryFixed: '#23005c',
  onSecondaryFixedVariant: '#5516be',

  // Tertiary (Ocean Blue / Cyan)
  tertiary: '#006387',
  tertiaryContainer: '#007da9',
  tertiaryFixed: '#c4e7ff',
  tertiaryFixedDim: '#7bd0ff',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#fcfcff',
  onTertiaryFixed: '#001e2c',
  onTertiaryFixedVariant: '#004c69',

  // Surface & Canvas (Light Clean Crisp Aesthetic)
  surface: '#f9f9ff',
  surfaceBright: '#f9f9ff',
  surfaceDim: '#cfdaf2',
  surfaceContainerLowest: '#ffffff', // Utama untuk Card Glassmorphism
  surfaceContainerLow: '#f0f3ff',    // Input & Toggle background
  surfaceContainer: '#e7eeff',
  surfaceContainerHigh: '#dee8ff',   // Chip & Accent pill
  surfaceContainerHighest: '#d8e3fb',
  surfaceVariant: '#d8e3fb',
  background: '#f9f9ff',

  // Inverse Surface
  inverseSurface: '#263143',
  inverseOnSurface: '#ecf1ff',

  // Text & Outline
  onSurface: '#111c2d',              // Text utama (deep dark navy)
  onSurfaceVariant: '#464554',       // Text muted / subtitle
  onBackground: '#111c2d',
  outline: '#767586',                // Border umum
  outlineVariant: '#c7c4d7',         // Border halus / placeholder

  // Error / Alert
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Status Presensi Dosen (Dikonfirmasi dari Screenshot 101532 & 101641)
  status: {
    realtime: {
      key: 'realtime',
      label: 'Terlacak',
      color: '#10b981',
      bg: '#ecfdf5',
      border: 'rgba(16, 185, 129, 0.25)',
      text: '#047857',
      dot: '#10b981',
    },
    prediksi: {
      key: 'prediksi',
      label: 'Prediksi',
      color: '#0284c7',
      bg: '#e0f2fe',
      border: 'rgba(2, 132, 199, 0.25)',
      text: '#0369a1',
      dot: '#0284c7',
    },
    tidak_diketahui: {
      key: 'tidak_diketahui',
      label: 'Tidak diketahui',
      color: '#6b7280',
      bg: '#f3f4f6',
      border: 'rgba(107, 114, 128, 0.2)',
      text: '#4b5563',
      dot: '#9ca3af',
    },
  },
};

export const gradients = {
  // Tombol aksi utama (CTA button)
  primaryCta: 'linear-gradient(to right, #4648d4, #6063ee, #6b38d4)',
  
  // Ambient Glow bola blur belakang kartu
  ambientPrimary: 'linear-gradient(to bottom right, #e1e0ff, #e9ddff)',
  ambientSecondary: 'linear-gradient(to top left, #e9ddff, rgba(225, 224, 255, 0.5), transparent)',

  // Overlay latar belakang halaman
  pageBackground: 'linear-gradient(to bottom, rgba(249, 249, 255, 0.4), rgba(249, 249, 255, 0.8), #f9f9ff)',
};

export const typography = {
  fontFamily: {
    base: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    icon: '"Material Symbols Outlined", sans-serif',
  },
  fontSize: {
    labelSm: {
      size: '11px',
      lineHeight: '16px',
      letterSpacing: '0.04em',
      fontWeight: 600,
    },
    labelMd: {
      size: '13px',
      lineHeight: '18px',
      fontWeight: 500,
    },
    bodyMd: {
      size: '14px',
      lineHeight: '22px',
      fontWeight: 400,
    },
    bodyLg: {
      size: '16px',
      lineHeight: '26px',
      fontWeight: 400,
    },
    titleMd: {
      size: '16px',
      lineHeight: '24px',
      fontWeight: 600,
    },
    headlineSm: {
      size: '20px',
      lineHeight: '28px',
      fontWeight: 600,
    },
    headlineMd: {
      size: '24px',
      lineHeight: '32px',
      letterSpacing: '-0.01em',
      fontWeight: 600,
    },
    headlineLgMobile: {
      size: '26px',
      lineHeight: '34px',
      letterSpacing: '-0.01em',
      fontWeight: 700,
    },
    headlineLg: {
      size: '32px',
      lineHeight: '40px',
      letterSpacing: '-0.02em',
      fontWeight: 700,
    },
    displayLg: {
      size: '44px',
      lineHeight: '52px',
      letterSpacing: '-0.02em',
      fontWeight: 700,
    },
  },
};

export const borderRadius = {
  sm: '0.5rem',    // 8px
  default: '1rem', // 16px
  lg: '2rem',      // 32px (Input & container rounded)
  xl: '3rem',      // 48px (Card authentication & modal)
  full: '9999px',  // Pill buttons, avatar, chip tabs
};

export const spacing = {
  spaceXs: '0.25rem',   // 4px
  spaceSm: '0.5rem',    // 8px
  spaceMd: '1rem',      // 16px
  spaceLg: '1.5rem',    // 24px
  spaceXl: '2rem',      // 32px
  gutterMobile: '1rem', // 16px
  marginMobile: '1rem', // 16px
  gutter: '1.5rem',     // 24px
  margin: '2.5rem',     // 40px
};

export const shadows = {
  // Shadow untuk kartu Glassmorphism
  card: '0 20px 25px -5px rgba(70, 72, 212, 0.1), 0 8px 10px -6px rgba(70, 72, 212, 0.1)',
  cardSm: '0 4px 6px -1px rgba(70, 72, 212, 0.08), 0 2px 4px -2px rgba(70, 72, 212, 0.06)',
  
  // Shadow tombol CTA primer
  btnPrimary: '0 10px 15px -3px rgba(70, 72, 212, 0.25), 0 4px 6px -4px rgba(70, 72, 212, 0.25)',
  btnPrimaryHover: '0 20px 25px -5px rgba(70, 72, 212, 0.4), 0 8px 10px -6px rgba(70, 72, 212, 0.4)',
  
  // Glow ambient lighting
  ambientGlow: '0 0 60px 20px rgba(96, 99, 238, 0.25)',
};

export const glassmorphism = {
  card: {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: shadows.card,
    borderRadius: borderRadius.xl,
  },
  chip: {
    backgroundColor: colors.surfaceContainerHigh,
    color: colors.primary,
    borderRadius: borderRadius.full,
  },
};

const theme = {
  colors,
  gradients,
  typography,
  borderRadius,
  spacing,
  shadows,
  glassmorphism,
};

export default theme;
