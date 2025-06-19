import React, { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [registerData, setRegisterData] = useState({ email: "", password: "", name: "" });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Inscription
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, registerData);
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur inscription");
    }
  };

  // Connexion
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, loginData);
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur connexion");
    }
  };

  // Simple logout
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h1>Auth React avec Backend Express</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!token ? (
        <>
          <h2>Inscription</h2>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Nom"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              required
            />
            <button type="submit">S'inscrire</button>
          </form>

          <h2>Connexion</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
            />
            <button type="submit">Se connecter</button>
          </form>
        </>
      ) : (
        <>
          <h2>Bienvenue {user?.name || user?.email} !</h2>
          <button onClick={handleLogout}>Déconnexion</button>
          <pre style={{ background: "#eee", padding: 10 }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

export default App;
