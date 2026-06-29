import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Docs from './Docs.jsx'

function Router() {
  const path = window.location.pathname
  if (path === '/docs' || path === '/docs/') return <Docs />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
