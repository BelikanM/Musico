import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";

const SmartPlayer = ({ publications, currentUser, handleLike, handleEdit, handleDelete }) => {
  const audioRefs = useRef({});
  const [sortedPublications, setSortedPublications] = useState([]);
  const [autoPlay, setAutoPlay] = useState(false); // Option pour activer/désactiver la lecture automatique

  // Fonction pour trier les publications par ordre alphabétique avec TensorFlow.js
  const sortPublications = async (pubs) => {
    try {
      // Créer un tableau de titres pour TensorFlow.js
      const titles = pubs.map((pub) => pub.title);
      const indices = tf.tensor1d([...Array(pubs.length).keys()]);

      // Simulation d'un tri alphabétique (TensorFlow.js pour démonstration)
      const sortedIndices = await tf.tidy(() => {
        const titleTensor = tf.tensor1d(titles.map((t) => t.toLowerCase().charCodeAt(0))); // Simplification basée sur le premier caractère
        const sorted = titleTensor.argsort(); // Trie par ordre croissant
        return sorted.arraySync();
      });

      // Réorganiser les publications selon les indices triés
      const sortedPubs = sortedIndices.map((index) => pubs[index]);
      setSortedPublications(sortedPubs);
    } catch (err) {
      console.error("Erreur lors du tri des publications:", err);
      setSortedPublications(pubs); // Fallback : utiliser les publications non triées
    }
  };

  // Trier les publications au chargement
  useEffect(() => {
    sortPublications(publications);
  }, [publications]);

  // Gérer la lecture audio pour arrêter les autres
  const handlePlay = (pubId) => {
    Object.keys(audioRefs.current).forEach((id) => {
      if (id !== pubId && audioRefs.current[id]) {
        audioRefs.current[id].pause();
        audioRefs.current[id].currentTime = 0; // Réinitialiser la lecture
      }
    });
  };

  return (
    <div className="publications-grid">
      {sortedPublications.map((pub) => (
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
                <audio
                  controls
                  src={pub.audioUrl}
                  className="custom-audio"
                  ref={(el) => (audioRefs.current[pub.id] = el)}
                  autoPlay={autoPlay && sortedPublications[0]?.id === pub.id} // Lecture automatique pour la première publication si activée
                  onPlay={() => handlePlay(pub.id)}
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
      <div className="autoplay-toggle">
        <label>
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={() => setAutoPlay(!autoPlay)}
          />
          Lecture automatique de la première publication
        </label>
      </div>
    </div>
  );
};

export default SmartPlayer;
