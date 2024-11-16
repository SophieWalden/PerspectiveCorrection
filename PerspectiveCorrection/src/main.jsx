import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {OpenCvProvider} from "opencv-react"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OpenCvProvider  openCvPath="https://docs.opencv.org/4.x/opencv.js">
      <App />
    </OpenCvProvider>
    
  </StrictMode>,
)
