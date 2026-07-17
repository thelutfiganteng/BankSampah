'use client';

import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only show once per tab session to avoid disrupting navigation
    const hasShown = sessionStorage.getItem('splash_shown');
    if (hasShown) {
      return;
    }

    setShouldRender(true);
    setVisible(true);
    sessionStorage.setItem('splash_shown', 'true');

    // Animate progress bar
    const duration = 1600; // 1.6 seconds
    const intervalTime = 20;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    // Fade out splash screen after progress completes
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, duration);

    // Unmount completely after fade-out transition finishes
    const removeTimer = setTimeout(() => {
      setShouldRender(false);
    }, duration + 800);

    return () => {
      clearInterval(timer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={`splash-overlay ${visible ? 'active' : 'fade-out'}`}>
      <div className="splash-content">
        {/* Glowing seedling logo wrapper */}
        <div className="logo-wrapper">
          <div className="orbiting-particles">
            <span className="dot dot-1"></span>
            <span className="dot dot-2"></span>
            <span className="dot dot-3"></span>
          </div>
          <div className="main-logo-pulse">
            <svg className="seedling-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 60V28M32 28C32 28 20 22 20 12C20 2 32 4 32 4M32 28C32 28 44 22 44 12C44 2 32 4 32 4" stroke="#4ade80" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M32 38C32 38 24 35 24 28C24 21 32 22 32 22M32 38C32 38 40 35 40 28C40 21 32 22 32 22" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <h1 className="splash-title">BANK SAMPAH <span className="highlight">ECO</span></h1>
        <p className="splash-subtitle">Mengubah Sampah Menjadi Ekonomi Hijau</p>

        {/* loading progress bar */}
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-percentage">{Math.min(100, Math.floor(progress))}%</div>
      </div>

      <style jsx>{`
        .splash-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at center, #052e16 0%, #020f08 100%);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          pointer-events: all;
          transition: opacity 800ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .splash-overlay.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        .splash-content {
          text-align: center;
          max-width: 400px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-logo-pulse {
          width: 90px;
          height: 90px;
          background: rgba(34, 197, 94, 0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(74, 222, 128, 0.2);
          animation: pulseGlow 2s infinite ease-in-out;
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.15);
        }

        .seedling-svg {
          width: 50px;
          height: 50px;
        }

        /* Orbiting particles surrounding logo */
        .orbiting-particles {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 1.5px dashed rgba(74, 222, 128, 0.15);
          animation: spin 10s linear infinite;
        }

        .dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background-color: var(--success);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--success);
        }
        .dot-1 { top: 0; left: 50%; transform: translate(-50%, -50%); }
        .dot-2 { bottom: 15%; left: 10%; }
        .dot-3 { bottom: 15%; right: 10%; }

        .splash-title {
          font-family: 'Outfit', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: 3px;
          margin-bottom: 8px;
          animation: fadeInUp 0.8s ease;
        }
        
        .splash-title .highlight {
          color: #4ade80;
        }

        .splash-subtitle {
          font-size: 0.92rem;
          color: rgba(248, 250, 252, 0.65);
          letter-spacing: 1px;
          margin-bottom: 32px;
          animation: fadeInUp 1s ease;
        }

        .progress-container {
          width: 180px;
          height: 4px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(to right, #22c55e, #4ade80);
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
        }

        .progress-percentage {
          font-size: 0.78rem;
          color: rgba(248, 250, 252, 0.4);
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1.0);
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.15);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 45px rgba(34, 197, 94, 0.35);
            background: rgba(34, 197, 94, 0.12);
            border-color: rgba(74, 222, 128, 0.35);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
