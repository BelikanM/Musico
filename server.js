const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Dossier uploads
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// Connexion MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connexion MongoDB réussie"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Modèle Utilisateur
const UserSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  name: String,
  password: String,
});
const User = mongoose.model("User", UserSchema);

// Modèle Publication (musique + contenu riche)
const PublicationSchema = new mongoose.Schema({
  userUuid: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" }, // HTML content from ReactQuill
  audioPath: String,
  imagePath: String,
  videoPath: String,
  createdAt: { type: Date, default: Date.now },
});
const Publication = mongoose.model("Publication", PublicationSchema);

// Middleware logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Middleware pour vérifier JWT et attacher user au req
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token manquant" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userUuid = decoded.uuid;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide" });
  }
};

// ROUTES AUTHENTIFICATION

// Inscription
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

    const newUser = await User.create({ uuid, email, name, password: hashed });
    const token = jwt.sign({ uuid }, process.env.JWT_SECRET);
    res.json({ token, user: newUser });
  } catch (err) {
    console.error("Erreur inscription:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Connexion
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

// Vérification token + infos user
app.get("/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uuid: req.userUuid }).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ROUTES PUBLICATION / UPLOADS

// Upload publication avec fichiers (audio obligatoire, image obligatoire, vidéo optionnelle)
app.post(
  "/upload",
  verifyToken,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title) return res.status(400).json({ error: "Titre requis" });
      if (!req.files["audio"] || !req.files["image"])
        return res.status(400).json({ error: "Audio et image obligatoires" });

      const audioPath = req.files["audio"][0].path;
      const imagePath = req.files["image"][0].path;
      const videoPath = req.files["video"]?.[0]?.path || "";

      const publication = await Publication.create({
        userUuid: req.userUuid,
        title,
        content,
        audioPath,
        imagePath,
        videoPath,
      });

      res.json({ message: "Publication créée avec succès", publication });
    } catch (err) {
      console.error("Erreur upload:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// Récupérer toutes les publications avec infos utilisateur
app.get("/publications", async (req, res) => {
  try {
    const publications = await Publication.find().sort({ createdAt: -1 });
    const userUuids = publications.map((p) => p.userUuid);
    const users = await User.find({ uuid: { $in: userUuids } });

    const result = publications.map((pub) => {
      const user = users.find((u) => u.uuid === pub.userUuid);
      return {
        id: pub._id,
        title: pub.title,
        content: pub.content,
        audioUrl: pub.audioPath ? `${req.protocol}://${req.get("host")}/${pub.audioPath}` : null,
        imageUrl: pub.imagePath ? `${req.protocol}://${req.get("host")}/${pub.imagePath}` : null,
        videoUrl: pub.videoPath ? `${req.protocol}://${req.get("host")}/${pub.videoPath}` : null,
        username: user ? user.name : "Inconnu",
        createdAt: pub.createdAt,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Erreur récupération publications:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer une publication par id (avec suppression des fichiers)
app.delete("/publications/:id", verifyToken, async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) return res.status(404).json({ error: "Publication non trouvée" });

    if (pub.userUuid !== req.userUuid)
      return res.status(403).json({ error: "Interdit: pas propriétaire" });

    // Supprimer fichiers s'ils existent
    if (pub.audioPath && fs.existsSync(pub.audioPath)) fs.unlinkSync(pub.audioPath);
    if (pub.imagePath && fs.existsSync(pub.imagePath)) fs.unlinkSync(pub.imagePath);
    if (pub.videoPath && fs.existsSync(pub.videoPath)) fs.unlinkSync(pub.videoPath);

    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: "Publication supprimée" });
  } catch (err) {
    console.error("Erreur suppression publication:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Servir les fichiers statiques (audio, image, vidéo)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Démarrer serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 Serveur en ligne sur http://localhost:${PORT}`);
});
