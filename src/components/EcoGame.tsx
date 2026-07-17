'use client';

import { useEffect, useRef, useState } from 'react';

interface Segment {
  x: number;
  y: number;
  angle: number;
}

interface TrashItem {
  id: number;
  x: number;
  y: number;
  type: 'plastik' | 'kaleng' | 'kertas';
  color: string;
  radius: number;
  recycled: boolean;
  flowerPetals?: number;
  flowerColor?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  radius: number;
}

export default function EcoGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game states
  const [score, setScore] = useState(0);
  const [activeTrashCount, setActiveTrashCount] = useState(0);
  
  // Audio state
  const audioContextRef = useRef<AudioContext | null>(null);

  // References for animation loop variables
  const targetRef = useRef({ x: 150, y: 150, isDragging: false });
  const segmentsRef = useRef<Segment[]>([]);
  const trashItemsRef = useRef<TrashItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextTrashIdRef = useRef(1);

  // Sound generator
  const playSynthesizedChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      // Retro chime: quick frequency slide C5 -> E5 -> G5
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Web Audio blocked or not supported:', e);
    }
  };

  // Generate a random trash item
  const generateTrash = (width: number, height: number): TrashItem => {
    const padding = 40;
    const types: ('plastik' | 'kaleng' | 'kertas')[] = ['plastik', 'kaleng', 'kertas'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let color = '#3b82f6';
    if (type === 'kaleng') color = '#ef4444';
    if (type === 'kertas') color = '#94a3b8';

    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#eab308'];

    return {
      id: nextTrashIdRef.current++,
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2),
      type,
      color,
      radius: 12 + Math.random() * 6,
      recycled: false,
      flowerPetals: 5 + Math.floor(Math.random() * 3),
      flowerColor: colors[Math.floor(Math.random() * colors.length)],
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 320;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize segments (Caterpillar)
    const segCount = 8;
    const segLength = 15;
    const startX = canvas.width / 2;
    const startY = canvas.height / 2;
    
    const initialSegments: Segment[] = [];
    for (let i = 0; i < segCount; i++) {
      initialSegments.push({
        x: startX - i * segLength,
        y: startY,
        angle: 0,
      });
    }
    segmentsRef.current = initialSegments;
    targetRef.current = { x: startX, y: startY - 40, isDragging: false };

    // Initialize trash items
    const initialTrash: TrashItem[] = [];
    for (let i = 0; i < 4; i++) {
      initialTrash.push(generateTrash(canvas.width, canvas.height));
    }
    trashItemsRef.current = initialTrash;
    setActiveTrashCount(4);

    let animationId: number;
    let time = 0;

    // Game loop
    const update = () => {
      time += 0.05;
      
      const segments = segmentsRef.current;
      const target = targetRef.current;
      const trashItems = trashItemsRef.current;
      const particles = particlesRef.current;

      // 1. Move caterpillar head towards target
      if (segments.length > 0) {
        const head = segments[0];
        const dx = target.x - head.x;
        const dy = target.y - head.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Turn towards target
        if (dist > 8) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - head.angle;
          
          // Normalize angle difference to -PI to PI
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          head.angle += angleDiff * 0.15; // Rotational ease
          
          // Crawl forward
          const speed = 2.5;
          head.x += Math.cos(head.angle) * speed;
          head.y += Math.sin(head.angle) * speed;
        }

        // 2. Resolve body segments (Inverse Kinematics segment following)
        for (let i = 1; i < segments.length; i++) {
          const prev = segments[i - 1];
          const curr = segments[i];
          
          const sDx = prev.x - curr.x;
          const sDy = prev.y - curr.y;
          const sDist = Math.sqrt(sDx * sDx + sDy * sDy);

          if (sDist > 0) {
            curr.angle = Math.atan2(sDy, sDx);
            curr.x = prev.x - Math.cos(curr.angle) * segLength;
            curr.y = prev.y - Math.sin(curr.angle) * segLength;
          }
        }
      }

      // 3. Collision detection with trash
      if (segments.length > 0) {
        const head = segments[0];
        
        trashItems.forEach((item) => {
          if (!item.recycled) {
            const hitDx = head.x - item.x;
            const hitDy = head.y - item.y;
            const hitDist = Math.sqrt(hitDx * hitDx + hitDy * hitDy);

            if (hitDist < item.radius + 15) {
              item.recycled = true; // Recycle!
              setScore(s => s + 10);
              playSynthesizedChime();

              // Trigger particle explosion
              for (let p = 0; p < 12; p++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pSpeed = 1 + Math.random() * 3;
                particles.push({
                  x: item.x,
                  y: item.y,
                  vx: Math.cos(pAngle) * pSpeed,
                  vy: Math.sin(pAngle) * pSpeed,
                  color: item.color,
                  alpha: 1.0,
                  radius: 2 + Math.random() * 3,
                });
              }
            }
          }
        });
      }

      // 4. Update particles
      particlesRef.current = particles
        .map(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.04;
          return p;
        })
        .filter(p => p.alpha > 0);

      // 5. Replenish eaten trash if count goes low
      const activeTrash = trashItems.filter(t => !t.recycled);
      setActiveTrashCount(activeTrash.length);
      if (activeTrash.length < 3) {
        // Find recycled slots and replenish them
        const recycledIndex = trashItems.findIndex(t => t.recycled);
        if (recycledIndex > -1) {
          // Replace it with a new one
          trashItems[recycledIndex] = generateTrash(canvas.width, canvas.height);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const segments = segmentsRef.current;
      const target = targetRef.current;
      const trashItems = trashItemsRef.current;
      const particles = particlesRef.current;

      // Draw Composting Soil Base
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid / Texture dots
      ctx.fillStyle = 'rgba(21, 128, 61, 0.04)';
      for (let gridX = 20; gridX < canvas.width; gridX += 40) {
        for (let gridY = 20; gridY < canvas.height; gridY += 40) {
          ctx.beginPath();
          ctx.arc(gridX, gridY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 1. Draw Flowers & Eaten Trash
      trashItems.forEach((item) => {
        if (item.recycled) {
          // Sprouted Flower!
          ctx.save();
          ctx.translate(item.x, item.y);
          
          // Stem
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-5, 10, -3, 20);
          ctx.stroke();

          // Petals
          ctx.fillStyle = item.flowerColor || '#ec4899';
          const petals = item.flowerPetals || 6;
          for (let p = 0; p < petals; p++) {
            ctx.rotate((Math.PI * 2) / petals);
            ctx.beginPath();
            ctx.arc(0, -6, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Center
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        } else {
          // Draw Trash Items
          ctx.save();
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
          
          if (item.type === 'plastik') {
            // Draw Blue Plastic Bottle Capsule
            ctx.fillStyle = '#3b82f6';
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            ctx.roundRect(item.x - 8, item.y - 12, 16, 24, 6);
            ctx.fill();
            ctx.stroke();

            // Bottle Cap
            ctx.fillStyle = '#facc15';
            ctx.fillRect(item.x - 4, item.y - 15, 8, 4);
          } else if (item.type === 'kaleng') {
            // Draw Red Metal Soda Can
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(item.x - 9, item.y - 10, 18, 20, 3);
            ctx.fill();
            ctx.stroke();
            
            // Rim details
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(item.x - 9, item.y - 12, 18, 2);
            ctx.fillRect(item.x - 9, item.y + 10, 18, 2);
          } else {
            // Draw Crumpled Paper Ball
            ctx.fillStyle = '#e2e8f0';
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            
            // Draw a jagged circle
            const points = 8;
            for (let pt = 0; pt < points; pt++) {
              const ptAngle = (pt * Math.PI * 2) / points;
              const ptRadius = item.radius + (pt % 2 === 0 ? 2 : -2);
              const pX = item.x + Math.cos(ptAngle) * ptRadius;
              const pY = item.y + Math.sin(ptAngle) * ptRadius;
              if (pt === 0) ctx.moveTo(pX, pY);
              else ctx.lineTo(pX, pY);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }
      });

      // 2. Draw Particles
      particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Target Leaf
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.translate(target.x, target.y);
      ctx.rotate(0.3);

      // Draw Leaf Shape
      ctx.fillStyle = '#22c55e'; // Green Leaf
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(12, -7, 0, 14);
      ctx.quadraticCurveTo(-12, -7, 0, -14);
      ctx.closePath();
      ctx.fill();

      // Stem Line
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 18);
      ctx.stroke();

      // Stem Ring handle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 4. Draw Caterpillar Segments
      for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i];
        ctx.save();
        ctx.translate(seg.x, seg.y);
        ctx.rotate(seg.angle);

        // segment sizes (tapered tail)
        const size = i === 0 ? 12 : Math.max(7, 11 - i * 0.7);

        // Procedural Leg gait animation
        // Alternate leg movement between tripod sets
        const legPhase = time * 3.5 + i * 0.8;
        const leftLegOffset = Math.sin(legPhase) * 6;
        const rightLegOffset = Math.cos(legPhase) * 6;

        // Draw little legs for body segments (not head or tail segment)
        if (i > 0 && i < segments.length - 1) {
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 2.5;

          // Left Leg
          ctx.beginPath();
          ctx.moveTo(0, -size + 2);
          ctx.lineTo(-2 + leftLegOffset * 0.3, -size - 4 + Math.abs(leftLegOffset) * 0.3);
          ctx.stroke();

          // Right Leg
          ctx.beginPath();
          ctx.moveTo(0, size - 2);
          ctx.lineTo(-2 + rightLegOffset * 0.3, size + 4 - Math.abs(rightLegOffset) * 0.3);
          ctx.stroke();
        }

        // Draw segment body
        ctx.fillStyle = i === 0 ? '#15803d' : '#22c55e'; // Dark green head, green body
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw Head Details (Eyes & Antennas)
        if (i === 0) {
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(4, -4, 3, 0, Math.PI * 2);
          ctx.arc(4, 4, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
          ctx.arc(5, 4, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Antennas
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(5, -6);
          ctx.quadraticCurveTo(8, -12, 12, -10);
          ctx.moveTo(5, 6);
          ctx.quadraticCurveTo(8, 12, 12, 10);
          ctx.stroke();

          // Antenna Tips
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(12, -10, 2, 0, Math.PI * 2);
          ctx.arc(12, 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Mouse & Touch Handlers for dragging the Leaf
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Support multi-device pointer positioning
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const target = targetRef.current;
    const dx = x - target.x;
    const dy = y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If click is near leaf, start dragging
    if (dist < 30) {
      targetRef.current.isDragging = true;
      canvas.setPointerCapture(e.pointerId);

      // Initialize audio on first user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const target = targetRef.current;
    if (!target.isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Boundaries check
    const x = Math.max(15, Math.min(canvas.width - 15, clientX - rect.left));
    const y = Math.max(15, Math.min(canvas.height - 15, clientY - rect.top));

    targetRef.current.x = x;
    targetRef.current.y = y;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    targetRef.current.isDragging = false;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="card eco-game-card animate-fade-in-up">
      <div className="game-card-header flex-between">
        <div>
          <h3>✨ Game Interaktif: Kompos Mandiri</h3>
          <p className="game-sub">Drag daun hijau (🍃) untuk menuntun ulat memakan sampah plastik & logam!</p>
        </div>
        <div className="score-badge">
          Poin Game: <strong>{score}</strong>
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas 
          ref={canvasRef} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none', display: 'block', cursor: 'grab' }}
        />
        
        {/* Help tooltip */}
        <div className="game-help-tooltip animate-fade-in">
          🖱️ Seret daun untuk mengarahkan ulat makan sampah!
        </div>
      </div>

      <style jsx>{`
        .eco-game-card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .game-card-header {
          margin-bottom: 16px;
        }
        .game-card-header h3 {
          font-size: 1.3rem;
          color: var(--primary);
        }
        .game-sub {
          font-size: 0.85rem;
          color: var(--muted);
          margin-top: 2px;
        }
        .score-badge {
          background-color: rgba(21, 128, 61, 0.1);
          color: var(--primary);
          padding: 6px 14px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 0.9rem;
          box-shadow: var(--glow);
        }
        
        .canvas-wrapper {
          border-radius: 12px;
          border: 1px solid var(--card-border);
          overflow: hidden;
          position: relative;
          background-color: #f8fafc;
        }
        
        .game-help-tooltip {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(15, 23, 42, 0.8);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
          pointer-events: none;
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
}
