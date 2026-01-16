/**
 * Main App component with tab-based navigation
 */

import { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout, type DomainTab } from './components/Layout';
import { Playbooks } from './pages/Playbooks';
import { ExecutionDetail } from './pages/ExecutionDetail';
import { Settings } from './pages/Settings';
import { useWebSocket } from './hooks/useWebSocket';
import { useStore } from './store';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Warp Terminal Color Palette
const warpColors = {
  dark: {
    background: '#01050d',
    surface: '#161b22',
    surfaceVariant: '#0d1117',
    border: '#30363d',
    primary: '#58a6ff',
    secondary: '#1f6feb',
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
    text: '#c9d1d9',
    textSecondary: '#8b949e',
  },
  light: {
    background: '#ffffff',
    surface: '#f6f8fa',
    surfaceVariant: '#f0f3f6',
    border: '#d0d7de',
    primary: '#0969da',
    secondary: '#0550ae',
    success: '#1a7f37',
    warning: '#9a6700',
    error: '#cf222e',
    text: '#24292f',
    textSecondary: '#57606a',
  },
};

function AppContent() {
  const [activeTab, setActiveTab] = useState<DomainTab>('gateway');
  const setExecutionUpdate = useStore((state) => state.setExecutionUpdate);
  const setScreenshotFrame = useStore((state) => state.setScreenshotFrame);
  const themeMode = useStore((state) => state.theme);

  // Create theme based on current mode from store
  const theme = useMemo(() => {
    const colors = warpColors[themeMode];

    return createTheme({
      palette: {
        mode: themeMode,
        primary: {
          main: colors.primary,
          light: themeMode === 'dark' ? '#79c0ff' : '#54aeff',
          dark: colors.secondary,
        },
        secondary: {
          main: colors.secondary,
        },
        success: {
          main: colors.success,
        },
        warning: {
          main: colors.warning,
        },
        error: {
          main: colors.error,
        },
        background: {
          default: colors.background,
          paper: colors.surface,
        },
        text: {
          primary: colors.text,
          secondary: colors.textSecondary,
        },
        divider: colors.border,
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          },
        },
      },
    });
  }, [themeMode]);

  // Connect to WebSocket for real-time updates (silent - no UI indicators)
  useWebSocket({
    onExecutionUpdate: (update) => setExecutionUpdate(update.execution_id, update),
    onScreenshotFrame: (frame) => setScreenshotFrame(frame.executionId, frame),
  });

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'gateway':
        return <Playbooks domainFilter="gateway" />;
      case 'designer':
        return <Playbooks domainFilter="designer" />;
      case 'perspective':
        return <Playbooks domainFilter="perspective" />;
      case 'settings':
        return <Settings />;
      default:
        return <Playbooks domainFilter="gateway" />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </ThemeProvider>
  );
}

// Wrapper for execution detail that handles routing
function ExecutionDetailWrapper() {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  const setExecutionUpdate = useStore((state) => state.setExecutionUpdate);
  const setScreenshotFrame = useStore((state) => state.setScreenshotFrame);
  const themeMode = useStore((state) => state.theme);

  // WebSocket for real-time updates
  useWebSocket({
    onExecutionUpdate: (update) => setExecutionUpdate(update.execution_id, update),
    onScreenshotFrame: (frame) => setScreenshotFrame(frame.executionId, frame),
  });

  // Create theme
  const theme = useMemo(() => {
    const colors = warpColors[themeMode];
    return createTheme({
      palette: {
        mode: themeMode,
        primary: { main: colors.primary, light: themeMode === 'dark' ? '#79c0ff' : '#54aeff', dark: colors.secondary },
        secondary: { main: colors.secondary },
        success: { main: colors.success },
        warning: { main: colors.warning },
        error: { main: colors.error },
        background: { default: colors.background, paper: colors.surface },
        text: { primary: colors.text, secondary: colors.textSecondary },
        divider: colors.border,
      },
    });
  }, [themeMode]);

  if (!executionId) {
    navigate('/');
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ExecutionDetail />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/executions/:executionId" element={<ExecutionDetailWrapper />} />
          </Routes>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
