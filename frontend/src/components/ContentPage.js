import React, { useEffect, useState } from "react";
import "./ContentPage.css";

const ContentPage = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [publications, setPublications] = useState([]);
  const [followingPublications, setFollowingPublications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortOption, setSortOption] = useState("date-desc");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchPublications();
      fetchFollowingPublications();
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("http://localhost:5000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCurrentUser(data);
    } catch (err) {
      console.error("Erreur récupération utilisateur:", err);
    }
  };

  const fetchPublications = async () => {
    try {
      const res = await fetch("http://localhost:5000/publications");
      const data = await res.json();
      setPublications(data);
    } catch (err) {
      console.error("Erreur loading publications:", err);
    }
  };

  const fetchFollowingPublications = async () => {
    try {
      const res = await fetch("http://localhost:5000/publications/following", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFollowingPublications(data);
    } catch (err) {
      console.error("Erreur loading following publications:", err);
    }
  };

  const handleLike = async (pubId) => {
    if (!token) return alert("🔒 Connecte-toi pour liker");
    try {
      const res = await fetch(`http://localhost:5000/publications/${pubId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.message) {
        fetchPublications();
        fetchFollowingPublications();
      }
    } catch (err) {
      console.error("Erreur like/unlike:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setCurrentUser(null);
  };

  // Filter and sort publications
  const getFilteredAndSortedPublications = (pubs) => {
    let filtered = pubs.filter(
      (pub) =>
        pub.title.toLowerCase().includes(filterText.toLowerCase()) ||
        pub.username.toLowerCase().includes(filterText.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortOption === "date-desc") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortOption === "date-asc") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortOption === "likes-desc") {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return 0;
    });
  };

  return (
    <div className="content-container">
      {token && (
        <div className="header">
          <h2>🎵 Contenus</h2>
          <div className="user-info">
            <span>👤 {currentUser?.name}</span>
            <button onClick={logout} className="btn small">🔓 Déconnexion</button>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          Toutes les publications
        </button>
        {token && (
          <button
            className={`tab ${activeTab === "following" ? "active" : ""}`}
            onClick={() => setActiveTab("following")}
          >
            Suivis
          </button>
        )}
      </div>

      <div className="options">
        <input
          type="text"
          placeholder="Rechercher par titre ou auteur..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="search-input"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="sort-select"
        >
          <option value="date-desc">Plus récent</option>
          <option value="date-asc">Plus ancien</option>
          <option value="likes-desc">Plus de likes</option>
        </select>
      </div>

      <div className="publications-grid">
        {getFilteredAndSortedPublications(
          activeTab === "all" ? publications : followingPublications
        ).map((pub) => (
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
                  <div className="like-section">
                    <button
                      onClick={() => handleLike(pub.id)}
                      className={`btn small ${
                        pub.likedBy?.includes(currentUser?.uuid) ? "liked" : ""
                      }`}
                    >
                      ❤️ {pub.likesCount || 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentPage;
