import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';
import { ThemeProvider } from './theme/ThemeProvider';
import { NavigationProvider } from './compat/navigation-store';
import { App } from './App';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--sf-color-bg, #F7FAF9)', color: 'var(--sf-color-text-primary, #132B29)', padding: '2rem' }}>
          <div style={{ maxWidth: '500px', background: 'var(--sf-color-surface, #FFFFFF)', border: '1px solid var(--sf-color-error-border, #FCA5A5)', borderRadius: '12px', padding: '2rem', textAlign: 'center', boxShadow: 'var(--sf-shadow-lg)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--sf-color-text-primary)' }}>Something went wrong</h2>
            <p style={{ color: 'var(--sf-color-text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              LearnUp encountered an unexpected rendering error. Your SQLite database and local notes remain safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'var(--sf-color-primary, #0F766E)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.65rem 1.4rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <NavigationProvider>
          <App />
        </NavigationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
