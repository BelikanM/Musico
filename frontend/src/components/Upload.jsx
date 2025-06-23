import React, { useEffect, useState } from "react";
import "./Upload.css";

const Upload = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audio, setAudio] = useState(null);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [myPublications, setMyPublications] = useState([]);
  const [feedPublications, setFeedPublications] = useState([]);
  const [userPublications, setUserPublications] = useState([]);
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchMyPublications();
      fetchFeedPublications();
      fetchUsers();
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("http://localhost:5000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur récupération utilisateur");
      const data = await res.json();
      setCurrentUser(data);
    } catch (err) {
      console.error("Erreur récupération utilisateur:", err);
      setToken("");
      localStorage.removeItem("token");
    }
  };

  const fetchMyPublications = async () => {
    try {
      const res = await fetch("http://localhost:5000/publications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement publications");
      const data = await res.json();
      const userPublications = data.filter(
        (pub) => pub.userUuid === currentUser?.uuid
      );
      setMyPublications(userPublications);
    } catch (err) {
      console.error("Erreur chargement publications:", err);
    }
  };

  const fetchFeedPublications = async () => {
    try {
      const res = await fetch("http://localhost:5000/publications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement publications");
      const data = await res.json();
      const feed = data.filter(
        (pub) => currentUser?.following?.includes(pub.userUuid)
      );
      setFeedPublications(feed);
    } catch (err) {
      console.error("Erreur chargement publications du mur:", err);
    }
  };

  const fetchUserPublications = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5000/users/${userId}/publications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erreur chargement publications utilisateur");
      const data = await res.json();
      setUserPublications(data);
      setActiveTab("userProfile");
      setSelectedUserId(userId);
    } catch (err) {
      console.error("Erreur chargement publications utilisateur:", err);
      alert("Erreur lors du chargement du profil");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement utilisateurs");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Erreur chargement utilisateurs:", err);
    }
  };

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
      alert("Erreur lors de l'authentification");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return alert("🔒 Connecte-toi d'abord");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (audio) formData.append("audio", audio);
    if (image) formData.append("image", image);
    if (video) formData.append("video", video);

    try {
      const url = editingId
        ? `http://localhost:5000/publications/${editingId}`
        : "http://localhost:5000/publications";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Erreur lors de l'opération");
      const data = await res.json();
      alert(data.message || "✅ Opération réussie");

      setTitle("");
      setContent("");
      setAudio(null);
      setImage(null);
      setVideo(null);
      setEditingId(null);
      fetchMyPublications();
    } catch (err) {
      console.error("Erreur upload:", err);
      alert("Erreur lors de la publication");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    try {
      const pub = myPublications.find((p) => p.id === id);
      if (!pub || pub.userUuid !== currentUser?.uuid) {
        return alert("⛔ Tu ne peux pas supprimer cette publication");
      }
      const res = await fetch(`http://localhost:5000/publications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur suppression");
      const data = await res.json();
      alert(data.message);
      fetchMyPublications();
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleEdit = (pub) => {
    if (pub.userUuid !== currentUser?.uuid) {
      return alert("⛔ Tu ne peux pas modifier cette publication");
    }
    setTitle(pub.title);
    setContent(pub.content);
    setEditingId(pub.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFollow = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5000/users/${userId}/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Erreur follow/unfollow");
      const data = await res.json();
      if (data.message) {
        fetchUsers();
        fetchCurrentUser();
        fetchFeedPublications();
      }
    } catch (err) {
      console.error("Erreur follow/unfollow:", err);
      alert("Erreur lors de l'action");
    }
  };

  const handleLike = async (pubId) => {
    if (!token) return alert("🔒 Connecte-toi pour liker une publication");
    try {
      const res = await fetch(`http://localhost:5000/publications/${pubId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Erreur like/unlike");
      const data = await res.json();
      if (data.message) {
        fetchMyPublications();
        fetchFeedPublications();
        if (selectedUserId) fetchUserPublications(selectedUserId);
      }
    } catch (err) {
      console.error("Erreur like/unlike:", err);
      alert("Erreur lors de l'action like");
    }
  };

  const handleViewUserProfile = async (userId) => {
    await fetchUserPublications(userId);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setCurrentUser(null);
    setMyPublications([]);
    setFeedPublications([]);
    setUserPublications([]);
    setSelectedUserId(null);
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
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="btn toggle-btn"
          >
            {isLoginMode ? "Créer un compte" : "Se connecter"}
          </button>
        </div>
      ) : (
        <>
          <div className="header">
            <h2>
              {activeTab === "profile"
                ? "🎙️ Mon Profil"
                : activeTab === "feed"
                ? "📜 Mur"
                : activeTab === "users"
                ? "👥 Utilisateurs"
                : `👤 Profil de ${
                    users.find((u) => u.uuid === selectedUserId)?.name || "Utilisateur"
                  }`}
            </h2>
            <div className="user-info">
              <span>👤 {currentUser?.name}</span>
              <button onClick={logout} className="btn small">🔓 Déconnexion</button>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("profile");
                setSelectedUserId(null);
              }}
            >
              Mon Profil
            </button>
            <button
              className={`tab ${activeTab === "feed" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("feed");
                setSelectedUserId(null);
                fetchFeedPublications();
              }}
            >
              Mur
            </button>
            <button
              className={`tab ${activeTab === "users" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("users");
                setSelectedUserId(null);
              }}
            >
              Utilisateurs
            </button>
          </div>

          {activeTab === "profile" && (
            <>
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
                <div className="file-inputs">
                  <label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudio(e.target.files[0])}
                      className="input-file"
                      required={!editingId}
                    />
                    <span className="file-label">🎵</span>
                  </label>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files[0])}
                      className="input-file"
                      required={!editingId}
                    />
                    <span className="file-label">🖼️</span>
                  </label>
                  <label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideo(e.target.files[0])}
                      className="input-file"
                    />
                    <span className="file-label">🎥</span>
                  </label>
                </div>
                <button type="submit" className="btn" title={editingId ? "Enregistrer" : "Publier"}>
                  {editingId ? "💾" : "✅"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn cancel"
                    onClick={() => {
                      setEditingId(null);
                      setTitle("");
                      setContent("");
                      setAudio(null);
                      setImage(null);
                      setVideo(null);
                    }}
                    title="Annuler"
                  >
                    ❌
                  </button>
                )}
              </form>

              <div className="publications-container">
                <div className="publications-grid">
                  {myPublications.length > 0 ? (
                    myPublications.map((pub) => (
                      <div className="music-card" key={pub.id}>
                        <div
                          className="music-cover"
                          style={{ backgroundImage: `url(${pub.imageUrl})` }}
                        >
                          <div className="overlay">
                            <h3 className="music-title">{pub.title}</h3>
                            <p className="music-author">👤 {pub.username}</p>
                            <div
                              className="content-container"
                              dangerouslySetInnerHTML={{ __html: pub.content }}
                            />
                            {pub.audioUrl && (
                              <audio controls src={pub.audioUrl} className="custom-audio" />
                            )}
                            {pub.videoUrl && (
                              <video controls src={pub.videoUrl} className="video-player" />
                            )}
                            <div className="meta-info">
                              <small>🕒 {new Date(pub.createdAt).toLocaleString()}</small>
                              <div className="likes-section">
                                <button
                                  onClick={() => handleLike(pub.id)}
                                  className={`btn small ${pub.likedByUser ? "liked" : ""}`}
                                >
                                  {pub.likedByUser ? "❤️" : "🤍"} {pub.likes}{" "}
                                  {pub.likes === 1 ? "Like" : "Likes"}
                                </button>
                              </div>
                              <div className="actions">
                                <button
                                  onClick={() => handleEdit(pub)}
                                  className="btn small"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(pub.id)}
                                  className="btn small danger"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Aucune publication pour le moment.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "feed" && (
            <div className="publications-container">
              <div className="publications-grid">
                {feedPublications.length > 0 ? (
                  feedPublications.map((pub) => (
                    <div className="music-card" key={pub.id}>
                      <div
                        className="music-cover"
                        style={{ backgroundImage: `url(${pub.imageUrl})` }}
                      >
                        <div className="overlay">
                          <h3 className="music-title">{pub.title}</h3>
                          <p className="music-author">👤 {pub.username}</p>
                          <div
                            className="content-container"
                            dangerouslySetInnerHTML={{ __html: pub.content }}
                          />
                          {pub.audioUrl && (
                            <audio controls src={pub.audioUrl} className="custom-audio" />
                          )}
                          {pub.videoUrl && (
                            <video controls src={pub.videoUrl} className="video-player" />
                          )}
                          <div className="meta-info">
                            <small>🕒 {new Date(pub.createdAt).toLocaleString()}</small>
                            <div className="likes-section">
                              <button
                                onClick={() => handleLike(pub.id)}
                                className={`btn small ${pub.likedByUser ? "liked" : ""}`}
                              >
                                {pub.likedByUser ? "❤️" : "🤍"} {pub.likes}{" "}
                                {pub.likes === 1 ? "Like" : "Likes"}
                              </button>
                            </div>
                            {pub.userUuid === currentUser?.uuid && (
                              <div className="actions">
                                <button
                                  onClick={() => handleEdit(pub)}
                                  className="btn small"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(pub.id)}
                                  className="btn small danger"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Aucune publication dans ton fil d'actualité. Suis d'autres utilisateurs !</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "userProfile" && (
            <div className="publications-container">
              <div className="publications-grid">
                {userPublications.length > 0 ? (
                  userPublications.map((pub) => (
                    <div className="music-card" key={pub.id}>
                      <div
                        className="music-cover"
                        style={{ backgroundImage: `url(${pub.imageUrl})` }}
                      >
                        <div className="overlay">
                          <h3 className="music-title">{pub.title}</h3>
                          <p className="music-author">👤 {pub.username}</p>
                          <div
                            className="content-container"
                            dangerouslySetInnerHTML={{ __html: pub.content }}
                          />
                          {pub.audioUrl && (
                            <audio controls src={pub.audioUrl} className="custom-audio" />
                          )}
                          {pub.videoUrl && (
                            <video controls src={pub.videoUrl} className="video-player" />
                          )}
                          <div className="meta-info">
                            <small>🕒 {new Date(pub.createdAt).toLocaleString()}</small>
                            <div className="likes-section">
                              <button
                                onClick={() => handleLike(pub.id)}
                                className={`btn small ${pub.likedByUser ? "liked" : ""}`}
                              >
                                {pub.likedByUser ? "❤️" : "🤍"} {pub.likes}{" "}
                                {pub.likes === 1 ? "Like" : "Likes"}
                              </button>
                            </div>
                            {pub.userUuid === currentUser?.uuid && (
                              <div className="actions">
                                <button
                                  onClick={() => handleEdit(pub)}
                                  className="btn small"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(pub.id)}
                                  className="btn small danger"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Cet utilisateur n'a pas de publications.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="users-container">
              <div className="users-list">
                <h3>Utilisateurs inscrits</h3>
                {users.map((user) => (
                  <div key={user.uuid} className="user-card">
                    <div className="user-info">
                      <h4>{user.name}</h4>
                      <p>{user.email}</p>
                      <small>
                        {user.followers?.length || 0} followers |{" "}
                        {user.following?.length || 0} suivis
                      </small>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => handleFollow(user.uuid)}
                        className={`btn small ${
                          currentUser?.following?.includes(user.uuid) ? "following" : ""
                        }`}
                      >
                        {currentUser?.following?.includes(user.uuid)
                          ? "✓ Suivi"
                          : "+ Suivre"}
                      </button>
                      <button
                        onClick={() => handleViewUserProfile(user.uuid)}
                        className="btn small"
                        title="Voir le profil"
                      >
                        👤
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Upload;
