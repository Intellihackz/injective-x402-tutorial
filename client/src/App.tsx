import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Download from "./Download";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/download/:id" element={<Download />} />
      </Routes>
    </Router>
  );
}

export default App;
