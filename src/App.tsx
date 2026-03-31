import LandingPage from './app/LandingPage.js';
import EditorApp from './app/EditorApp.js';
import { useAppRoute } from './app/router.js';

export default function App() {
  const route = useAppRoute();

  return route === 'editor' ? <EditorApp /> : <LandingPage />;
}
