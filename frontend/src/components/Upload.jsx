import React, { useState } from "react";

const Upload = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audio, setAudio] = useState(null);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleAuth = async () => {
    const url = isLoginMode
      ? "http://localhost:5000/auth/login"
      : "http://localhost:5000/auth/register";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        alert("✅ Connexion réussie !");
      } else {
        alert(data.error || "Erreur");
      }
    } catch (err) {
      console.error("Erreur auth :", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return alert("🔒 Connecte-toi d'abord");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("audio", audio);
    formData.append("image", image);
    if (video) formData.append("video", video);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      alert(data.message || "✅ Publication réussie");
      setTitle("");
      setContent("");
      setAudio(null);
      setImage(null);
      setVideo(null);
    } catch (err) {
      console.error("Erreur upload:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  return (
    <div className="container">
      {!token ? (
        <div className="auth-box">
          <h2>{isLoginMode ? "Connexion" : "Inscription"}</h2>
          {!isLoginMode && (
            <input
              type="text"
              placeholder="Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <button onClick={handleAuth} className="btn">
            {isLoginMode ? "Se connecter" : "S'inscrire"}
          </button>
          <p className="toggle">
            {isLoginMode ? "Pas de compte ?" : "Déjà inscrit ?"}{" "}
            <span onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? "Créer un compte" : "Connexion"}
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="header">
            <h2>🎙️ Nouvelle publication</h2>
            <button onClick={logout} className="btn small">🔓 Déconnexion</button>
          </div>
          <form onSubmit={handleSubmit} className="form">
            <input
              type="text"
              placeholder="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
            />

            <textarea
              placeholder="Contenu HTML"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="textarea"
              rows={6}
              required
            />

            <label>🎧 Audio :</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudio(e.target.files[0])}
              className="input-file"
              required
            />

            <label>🖼️ Image :</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="input-file"
              required
            />

            <label>🎥 Vidéo (optionnelle) :</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files[0])}
              className="input-file"
            />

            <button type="submit" className="btn">✅ Publier</button>
          </form>
        </>
      )}
    </div>
  );
};

export default Upload;
