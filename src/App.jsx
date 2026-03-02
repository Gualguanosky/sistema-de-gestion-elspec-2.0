import React from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import useAuth from './hooks/useAuth'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      <ErrorBoundary>
        {isAuthenticated ? <Dashboard /> : <Login />}
      </ErrorBoundary>
    </div>
  )
}

export default App
