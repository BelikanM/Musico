import React, { useEffect, useRef, useState } from "react";
import "./SmartPlayer.css"; // Fichier CSS pour le style du lecteur global

const SmartPlayer = ({ publications, currentUser, handleLike, handleEdit, handleDelete }) => {
  const audioRefs = useRef({});
  const cardRefs = useRef({});
  const [sortedPublications, setSortedPublications] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null); // Piste en cours
  const [isUserInitiated, setIsUserInitiated] = useState(false); // Lecture manuelle
  const [isPlaying, setIsPlaying] = useState(false); // État lecture/pause

  // Trier les publications par ordre alphabétique
  const sortPublications = (pubs) => {
    try {
      const sortedPubs = [...pubs].sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
      setSortedPublications(sortedPubs);
    } catch (err) {
      console.error("Erreur lors du tri des publications:", err);
      setSortedPublications(pubs);
    }
  };

  // Gérer la lecture audio
  const handlePlay = (pubId, userInitiated = false) => {
    Object.keys(audioRefs.current).forEach((id) => {
      if (id !== pubId && audioRefs.current[id]) {
        audioRefs.current[id].pause();
        audioRefs.current[id].currentTime = 0;
      }
    });
    if (audioRefs.current[pubId]) {
      audioRefs.current[pubId].play().catch((err) => {
        console.error("Erreur lecture:", err);
      });
      setIsPlaying(true);
    }
    setCurrentlyPlaying(pubId);
    setIsUserInitiated(userInitiated);
  };

  // Mettre en pause
  const handlePause = () => {
    if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
      audioRefs.current[currentlyPlaying].pause();
      setIsPlaying(false);
    }
  };

  // Passer à la piste suivante/précédente
  const playAdjacent = (direction) => {
    if (!currentlyPlaying) {
      // Si rien ne joue, commencer par la première piste
      const firstPub = sortedPublications[0];
      if (firstPub?.audioUrl) handlePlay(firstPub.id);
      return;
    }

    const currentIndex = sortedPublications.findIndex((pub) => pub.id === currentlyPlaying);
    let nextIndex;
    if (direction === "next") {
      nextIndex = (currentIndex + 1) % sortedPublications.length; // Boucler à la fin
    } else {
      nextIndex = (currentIndex - 1 + sortedPublications.length) % sortedPublications.length; // Boucler au début
    }
    const nextPub = sortedPublications[nextIndex];

    if (nextPub?.audioUrl && audioRefs.current[nextPub.id]) {
      handlePlay(nextPub.id, true); // Marquer comme lecture manuelle
    }
  };

  // IntersectionObserver pour lecture automatique au scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pubId = entry.target.dataset.pubId;
          const audio = audioRefs.current[pubId];

          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.6 &&
            audio &&
            !isUserInitiated &&
            currentlyPlaying !== pubId
          ) {
            handlePlay(pubId);
          }
        });
      },
      { threshold: 0.6 }
    );

    Object.keys(cardRefs.current).forEach((pubId) => {
      if (cardRefs.current[pubId]) observer.observe(cardRefs.current[pubId]);
    });

    return () => {
      Object.keys(cardRefs.current).forEach((pubId) => {
        if (cardRefs.current[pubId]) observer.unobserve(cardRefs.current[pubId]);
      });
    };
  }, [sortedPublications, currentlyPlaying, isUserInitiated]);

  // Trier les publications au chargement
  useEffect(() => {
    sortPublications(publications);
  }, [publications]);

  // Gérer la fin de lecture
  useEffect(() => {
    const handleEnded = (pubId) => () => {
      if (!isUserInitiated) {
        playAdjacent("next"); // Piste suivante si lecture automatique
      } else {
        setCurrentlyPlaying(null);
        setIsPlaying(false);
      }
    };

    Object.keys(audioRefs.current).forEach((pubId) => {
      const audio = audioRefs.current[pubId];
      if (audio) audio.addEventListener("ended", handleEnded(pubId));
    });

    return () => {
      Object.keys(audioRefs.current).forEach((pubId) => {
        const audio = audioRefs.current[pubId];
        if (audio) audio.removeEventListener("ended", handleEnded(pubId));
      });
    };
  }, [sortedPublications, isUserInitiated]);

  // Obtenir la piste en cours pour le lecteur global
  const currentPub = sortedPublications.find((pub) => pub.id === currentlyPlaying) || {};

  return (
    <div className="smart-player">
      <div className="publications-grid">
        {sortedPublications.map((pub) => (
          <div
            className="music-card"
            key={pub.id}
            data-pub-id={pub.id}
            ref={(el) => (cardRefs.current[pub.id] = el)}
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
                    onPlay={() => handlePlay(pub.id, true)}
                    onPause={() => setIsPlaying(false)}
                  />
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
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lecteur global */}
      {sortedPublications.length > 0 && (
        <div className="global-player">
          <div className="player-info">
            <span className="player-title">
              {currentPub.title || "Aucune piste sélectionnée"}
            </span>
            <span className="player-author">{currentPub.username || ""}</span>
          </div>
          <div className="player-controls">
            <button
              onClick={() => playAdjacent("prev")}
              className="player-btn"
              disabled={!currentlyPlaying}
            >
              ⏮️
            </button>
            <button
              onClick={isPlaying ? handlePause : () => handlePlay(currentlyPlaying || sortedPublications[0].id, true)}
              className="player-btn"
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <button
              onClick={() => playAdjacent("next")}
              className="player-btn"
              disabled={!currentlyPlaying}
            >
              ⏭️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartPlayer;
