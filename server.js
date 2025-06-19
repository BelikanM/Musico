const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const passport = require("passport");
const bcrypt = require("bcryptjs"); // ✅ remplacement ici
const jwt = require("jsonwebtoken");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Client, Users } = require("node-appwrite");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// === Connexion MongoDB ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connexion MongoDB réussie"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// === Mongoose User Schema ===
const UserSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  name: String,
  password: String,
  appwriteData: Object,
});
const User = mongoose.model("User", UserSchema);

// === JWT Strategy ===
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findOne({ uuid: payload.uuid });
        return done(null, user || false);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// === Synchronisation Appwrite → MongoDB ===
app.post("/auth/sync", async (req, res) => {
  const { uuid } = req.body;
  if (!uuid) return res.status(400).json({ error: "UUID manquant" });

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const users = new Users(client);

  try {
    const user = await users.get(uuid);
    const existing = await User.findOne({ uuid });

    if (existing) {
      existing.appwriteData = user;
      await existing.save();
      return res.json({ message: "Utilisateur mis à jour", user: existing });
    }

    const newUser = await User.create({
      uuid,
      email: user.email,
      name: user.name,
      appwriteData: user,
    });

    res.json({ message: "Utilisateur enregistré", user: newUser });
  } catch (err) {
    console.error("❌ Appwrite sync error:", err.message);
    res.status(500).json({ error: "Échec de la synchronisation" });
  }
});

// === Inscription ===
app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Champs requis" });

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Utilisateur existant" });

  const hashed = await bcrypt.hash(password, 10);
  const uuid = new mongoose.Types.ObjectId().toString();

  const newUser = await User.create({ uuid, email, name, password: hashed });
  const token = jwt.sign({ uuid }, process.env.JWT_SECRET);
  res.json({ token, user: newUser });
});

// === Connexion ===
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

  const token = jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET);
  res.json({ token, user });
});

// === Lancer le serveur ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 Serveur en ligne sur http://localhost:${PORT}`);
});
