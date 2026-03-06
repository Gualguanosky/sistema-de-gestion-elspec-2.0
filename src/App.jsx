import React from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import ContactForm from './components/ContactForm'
import useAuth from './hooks/useAuth'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const { isAuthenticated } = useAuth();

  // Public route: show contact form without requiring login
  if (window.location.pathname === '/formulario') {
    return (
      <ErrorBoundary>
        <ContactForm />
      </ErrorBoundary>
    );
  }

  return (
    <div className="App">
      <ErrorBoundary>
        {isAuthenticated ? <Dashboard /> : <Login />}
      </ErrorBoundary>
    </div>
  )
}

export default App
