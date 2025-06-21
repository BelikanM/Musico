import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";

const SmartPlayer = ({ publications, currentUser, handleLike, handleEdit, handleDelete, token }) => {
  const audioRefs = useRef({});
  const cardRefs = useRef({});
  const [sortedPublications, setSortedPublications] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [manualInteraction, setManualInteraction] = useState(false);
  const [sortBy, setSortBy] = useState("alphabetical"); // Tri par ordre alphabétique ou engagement
  const [doubleTap, setDoubleTap] = useState({}); // Suivre les double-clics par publication
  const timeoutRef = useRef(null);

  // Fonction pour trier les publications
  const sortPublications = async (pubs) => {
    try {
      const indices = tf.tensor1d([...Array(pubs.length).keys()]);
      let sortedIndices;

      if (sortBy === "engagement") {
        const scores = pubs.map((pub) => 0.6 * pub.likes + 0.4 * (pub.playCount || 0));
        sortedIndices = await tf.tidy(() => {
          const scoreTensor = tf.tensor1d(scores);
          return scoreTensor.argsort().reverse().arraySync(); // Tri décroissant
        });
      } else {
        const titles = pubs.map((pub) => pub.title);
        sortedIndices = await tf.tidy(() => {
          const titleTensor = tf.tensor1d(titles.map((t) => t.toLowerCase().charCodeAt(0)));
          return titleTensor.argsort().arraySync();
        });
      }

      const sortedPubs = sortedIndices.map((index) => pubs[index]);
      setSortedPublications(sortedPubs);
    } catch (err) {
      console.error("Erreur lors du tri des publications:", err);
      setSortedPublications(pubs);
    }
  };

  // Charger l'historique de lecture pour chaque publication
  const loadPlaybackHistory = async (pubId) => {
    try {
      const res = await fetch(`http://localhost:5000/playback/${pubId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.lastPosition || 0;
    } catch (err) {
      console.error("Erreur récupération historique:", err);
      return 0;
    }
  };

  // Gérer la lecture audio
  const handlePlay = async (pubId) => {
    Object.keys(audioRefs.current).forEach((id) => {
      if (id !== pubId && audioRefs.current[id]) {
        audioRefs.current[id].pause();
        audioRefs.current[id].currentTime = 0;
      }
    });

    // Incrémenter playCount
    try {
      await fetch(`http://localhost:5000/publications/${pubId}/play`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Erreur enregistrement lecture:", err);
    }

    setCurrentlyPlaying(pubId);
    setManualInteraction(true);
  };

  // Gérer la pause manuelle
  const handlePause = (pubId) => {
    if (currentlyPlaying === pubId) {
      setCurrentlyPlaying(null);
      setManualInteraction(false);
    }
  };

  // Gérer la fin de la lecture
  const handleEnded = (pubId) => {
    if (currentlyPlaying === pubId) {
      setCurrentlyPlaying(null);
      setManualInteraction(false);
    }
  };

  // Gérer le double-clic
  const handleDoubleTap = (pubId) => {
    setDoubleTap((prev) => ({
      ...prev,
      [pubId]: true,
    }));
    // Réinitialiser après 2 secondes
    setTimeout(() => {
      setDoubleTap((prev) => ({
        ...prev,
        [pubId]: false,
      }));
    }, 2000);
  };

  // Configurer IntersectionObserver pour lecture/pause automatique
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pubId = entry.target.dataset.pubId;
          const audio = audioRefs.current[pubId];

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && audio && !manualInteraction) {
            if (currentlyPlaying !== pubId && !audio.paused) return;

            timeoutRef.current = setTimeout(async () => {
              try {
                const lastPosition = await loadPlaybackHistory(pubId);
                if (audio) {
                  audio.currentTime = lastPosition;
                  audio.play().catch((err) => {
                    console.error("Erreur lecture automatique:", err);
                  });
                  handlePlay(pubId);
                }
              } catch (err) {
                console.error("Erreur chargement historique:", err);
              }
            }, 500);
          } else if (!entry.isIntersecting && entry.intersectionRatio < 0.5 && pubId === currentlyPlaying && audio) {
            audio.pause();
            setCurrentlyPlaying(null);
            setManualInteraction(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.keys(cardRefs.current).forEach((pubId) => {
      if (cardRefs.current[pubId]) {
        observer.observe(cardRefs.current[pubId]);
      }
    });

    return () => {
      Object.keys(cardRefs.current).forEach((pubId) => {
        if (cardRefs.current[pubId]) {
          observer.unobserve(cardRefs.current[pubId]);
        }
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sortedPublications, currentlyPlaying, manualInteraction, token]);

  // Mettre à jour l'historique de lecture
  useEffect(() => {
    const updatePlaybackHistory = () => {
      if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
        const audio = audioRefs.current[currentlyPlaying];
        fetch(`http://localhost:5000/playback/${currentlyPlaying}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lastPosition: audio.currentTime }),
        }).catch((err) => console.error("Erreur mise à jour historique:", err));
      }
    };

    const interval = setInterval(updatePlaybackHistory, 5000); // Mettre à jour toutes les 5 secondes
    return () => clearInterval(interval);
  }, [currentlyPlaying, token]);

  // Trier les publications au chargement
  useEffect(() => {
    sortPublications(publications);
  }, [publications, sortBy]);

  // Charger l'historique initial pour chaque audio
  useEffect(() => {
    sortedPublications.forEach(async (pub) => {
      if (audioRefs.current[pub.id]) {
        const lastPosition = await loadPlaybackHistory(pub.id);
        audioRefs.current[pub.id].currentTime = lastPosition;
      }
    });
  }, [sortedPublications, token]);

  return (
    <div className="publications-grid">
      <div className="sort-selector">
        <label>Trier par : </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="alphabetical">Ordre alphabétique</option>
          <option value="engagement">Engagement</option>
        </select>
      </div>
      {sortedPublications.map((pub) => (
        <div
          className={`music-card ${pub.id === currentlyPlaying ? "playing" : ""} ${
            doubleTap[pub.id] ? "double-tapped" : ""
          }`}
          key={pub.id}
          data-pub-id={pub.id}
          ref={(el) => (cardRefs.current[pub.id] = el)}
          onDoubleClick={() => handleDoubleTap(pub.id)}
        >
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
                <audio
                  controls
                  src={pub.audioUrl}
                  className="custom-audio"
                  ref={(el) => (audioRefs.current[pub.id] = el)}
                  onPlay={() => handlePlay(pub.id)}
                  onPause={() => handlePause(pub.id)}
                  onEnded={() => handleEnded(pub.id)}
                  onTimeUpdate={() => {
                    if (audioRefs.current[pub.id] && pub.id === currentlyPlaying) {
                      fetch(`http://localhost:5000/playback/${pub.id}`, {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ lastPosition: audioRefs.current[pub.id].currentTime }),
                      }).catch((err) => console.error("Erreur mise à jour historique:", err));
                    }
                  }}
                />
              )}
              {pub.videoUrl && (
                <video controls src={pub.videoUrl} className="video-player" />
              )}
              <div className="meta-info">
                <small>🕒 {new Date(pub.createdAt).toLocaleString()}</small>
                <small>▶️ Lectures: {pub.playCount || 0}</small>
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
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(pub.id)}
                      className="btn small danger"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                )}
                {doubleTap[pub.id] && (
                  <div className="double-tap-indicator">Double-clic détecté !</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmartPlayer;
