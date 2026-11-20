import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

async function start() {
  // 개발 서버에서만 가짜 claude.ai 런타임을 붙인다 (빌드 결과물에는 포함되지 않음)
  if (import.meta.env.DEV && !window.claude) await import('./dev-mock');
  const { App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
start();
