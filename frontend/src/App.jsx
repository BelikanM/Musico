import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Upload from "./components/Upload";
import Decouvre from "./components/Decouvre";
import Abonnement from "./components/Abonnement";
import "./index.css";

const App = () => {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/decouvre" element={<Decouvre />} />
            <Route path="/abonnement" element={<Abonnement />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
