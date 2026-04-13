'use client';

import { useEffect, useRef, useMemo } from 'react';
import 'katex/dist/katex.min.css';

interface SafeHTMLWithMathProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeHTMLWithMath({ html, className, style }: SafeHTMLWithMathProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const renderMath = async () => {
        try {
          // @ts-ignore
          const renderMathInElement = (await import('katex/dist/contrib/auto-render')).default;
          if (containerRef.current) {
            renderMathInElement(containerRef.current, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true },
              ],
              throwOnError: false,
            });
          }
        } catch (e) {
          console.warn('Failed to load auto-render', e);
        }
      };

      renderMath();
    }
  }, [html]);

  const processedHtml = useMemo(() => {
    if (!html) return '';
    return html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
