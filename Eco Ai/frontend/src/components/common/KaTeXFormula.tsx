import React, { useMemo } from 'react';
import katex from 'katex';

interface KaTeXFormulaProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const KaTeXFormula: React.FC<KaTeXFormulaProps> = ({ math, block = false, className = '' }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (e) {
      console.error('KaTeX rendering error for:', math, e);
      return math;
    }
  }, [math, block]);

  if (block) {
    return (
      <div
        className={`my-3 overflow-x-auto py-3 px-4 bg-slate-950/80 border border-slate-800/80 rounded-xl text-emerald-300 text-center font-mono text-base md:text-lg shadow-inner ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block font-mono text-emerald-300 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
