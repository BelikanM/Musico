import React from "react";
import { NavLink } from "react-router-dom";
import { FaMusic, FaUpload, FaUserFriends } from "react-icons/fa";

const Navbar = () => {
  return (
    <div className="navbar">
      <h1>🎧 TchaMusic</h1>
      <div className="nav-icons" style={{ display: "flex", gap: "20px" }}>
        <NavLink to="/decouvre" title="Découvre">
          <FaMusic size={24} />
        </NavLink>
        <NavLink to="/upload" title="Uploader">
          <FaUpload size={24} />
        </NavLink>
        <NavLink to="/abonnement" title="Abonnements">
          <FaUserFriends size={24} />
        </NavLink>
      </div>
    </div>
  );
};

export default Navbar;
