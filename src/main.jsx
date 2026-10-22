import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ZohoCrmProvider } from './context/ZohoCrmContext.jsx'
import { ChatMessagesProvider } from './context/ChatMessagesContext.jsx'
import { PitchProvider } from './context/PitchContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ZohoCrmProvider>
      <PitchProvider>
        <ChatMessagesProvider>
          <App />
        </ChatMessagesProvider>
      </PitchProvider>
    </ZohoCrmProvider>
  </StrictMode>,
)
