const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connexion MongoDB réussie"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Schéma utilisateur
const UserSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  name: String,
  password: String,
});
const User = mongoose.model("User", UserSchema);

// Middleware log des requêtes (pour debug)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Route inscription
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Champs requis" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ error: "Utilisateur existant" });

    const hashed = await bcrypt.hash(password, 10);
    const uuid = new mongoose.Types.ObjectId().toString();

    const newUser = await User.create({
      uuid,
      email,
      name,
      password: hashed,
    });

    const token = jwt.sign({ uuid }, process.env.JWT_SECRET);
    res.json({ token, user: newUser });
  } catch (err) {
    console.error("Erreur inscription:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route connexion
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    console.error("Erreur connexion:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Lancement serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 Serveur en ligne sur http://localhost:${PORT}`);
});
