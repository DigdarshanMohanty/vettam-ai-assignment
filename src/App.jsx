import './index.css';
import { PaginatedEditor } from './components/PaginatedEditor';

function App() {
  return (
    <div className="app-shell">
      <header className="toolbar">
        <h1>Tiptap Paginated Editor</h1>
        <p>A Proof-of-Concept demonstrating Google Docs-style pagination.</p>
      </header>
      <main className="app-main">
        <PaginatedEditor />
      </main>
    </div>
  );
}

export default App;