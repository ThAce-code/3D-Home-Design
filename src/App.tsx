import { Suspense, lazy } from 'react';
import LandingPage from './app/LandingPage.js';
import { useAppRoute } from './app/router.js';

const EditorApp = lazy(() => import('./app/EditorApp.js'));
const LiquidGlassDemoPage = lazy(() => import('./app/LiquidGlassDemoPage.js'));
const LandingRedesignDemoPage = lazy(() => import('./app/LandingRedesignDemoPage.js'));

export default function App() {
  const route = useAppRoute();

  if (route === 'editor') {
    return (
      <Suspense
        fallback={
          <div
            data-app-theme="editor"
            data-testid="editor-loading"
            className="flex h-screen w-screen items-center justify-center bg-[#f3efe6] text-[#2f2418]"
          >
            Loading editor...
          </div>
        }
      >
        <EditorApp />
      </Suspense>
    );
  }

  if (route === 'liquid-glass') {
    return (
      <Suspense fallback={null}>
        <LiquidGlassDemoPage />
      </Suspense>
    );
  }

  if (route === 'landing-demo') {
    return (
      <Suspense fallback={null}>
        <LandingRedesignDemoPage />
      </Suspense>
    );
  }

  return <LandingPage />;
}
