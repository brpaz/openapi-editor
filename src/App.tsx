import AppShell from "./components/layout/AppShell";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

console.log("App.tsx loaded");

function App() {
  console.log("App component rendering");
  useKeyboardShortcuts();

  return <AppShell />;
}

export default App;
