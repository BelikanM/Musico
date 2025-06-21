import React, { useEffect, useState } from "react";

const UserStats = ({ token }) => {
  const [stats, setStats] = useState({
    registered: 0,
    online: 0,
    active: 0,
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Récupérer le nombre total d'utilisateurs inscrits
        const usersRes = await fetch("http://localhost:5000/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const usersData = await usersRes.json();

        // Récupérer le nombre d'utilisateurs en ligne
        const onlineRes = await fetch("http://localhost:5000/users/online", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const onlineData = await onlineRes.json();

        // Récupérer le nombre d'utilisateurs actifs
        const activeRes = await fetch("http://localhost:5000/users/active", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const activeData = await activeRes.json();

        setStats({
          registered: usersData.length || 0,
          online: onlineData.count || 0,
          active: activeData.count || 0,
        });
      } catch (err) {
        console.error("Erreur récupération stats utilisateurs:", err);
      }
    };

    if (token) {
      fetchUserStats();
    }
  }, [token]);

  return (
    <div className="user-stats">
      <h3>Statistiques Utilisateurs</h3>
      <p>Inscrits : {stats.registered}</p>
      <p>En ligne : {stats.online}</p>
      <p>Actifs : {stats.active}</p>
    </div>
  );
};

export default UserStats;
