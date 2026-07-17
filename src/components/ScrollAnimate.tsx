'use client';

import { useEffect } from 'react';

export default function ScrollAnimate() {
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px', // Trigger slightly before entering viewport
      threshold: 0.05,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = entry.target as HTMLElement;
          section.classList.add('visible');
          
          // Select item elements inside container
          const items = section.querySelectorAll('.scroll-item');
          items.forEach((item, index) => {
            (item as HTMLElement).style.setProperty('--stagger-delay', `${index * 100}ms`);
            item.classList.add('visible');
          });
          
          // Stop observing once visible
          obs.unobserve(section);
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('section');
    sections.forEach((sec) => {
      // Add baseline animation class
      sec.classList.add('scroll-section');
      
      // Auto-tag inner children to run staggered delays
      const container = sec.querySelector('.container');
      const childrenToTag = container ? container.children : sec.children;
      
      Array.from(childrenToTag).forEach((child) => {
        // Exclude specific heavy canvas wrappers or helpers from resetting layout
        if (!child.classList.contains('canvas-wrapper')) {
          child.classList.add('scroll-item');
        }
      });
      
      observer.observe(sec);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
