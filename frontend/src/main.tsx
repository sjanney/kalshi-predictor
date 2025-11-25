import { StrictMode, Profiler } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for offline caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Performance profiling callback (only in development)
const onRenderCallback = (id: string, phase: 'mount' | 'update', actualDuration: number) => {
  if (process.env.NODE_ENV === 'development') {
    if (actualDuration > 16) { // Log slow renders (> 16ms for 60fps)
      console.log(`[Profiler] ${id} (${phase}): ${actualDuration.toFixed(2)}ms`)
    }
  }
}

const root = createRoot(document.getElementById('root')!)

if (process.env.NODE_ENV === 'development') {
  // Wrap in Profiler for development
  root.render(
    <StrictMode>
      <Profiler id="App" onRender={onRenderCallback}>
        <App />
      </Profiler>
    </StrictMode>
  )
} else {
  // Production: no profiler overhead
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
