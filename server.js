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

// Modèles
const UserSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  name: String,
  password: String,
  followers: [{ type: String }],
  following: [{ type: String }],
});
const User = mongoose.model("User", UserSchema);

const PublicationSchema = new mongoose.Schema({
  userUuid: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  audioPath: String,
  imagePath: String,
  videoPath: String,
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String }],
  playCount: { type: Number, default: 0 },
  authorPlayCount: { type: Number, default: 0 },
  playHistory: [{
    userUuid: String,
    timestamp: Date,
    weight: Number,
  }],
});
const Publication = mongoose.model("Publication", PublicationSchema);

const PlaybackHistorySchema = new mongoose.Schema({
  userUuid: { type: String, required: true },
  pubId: { type: String, required: true },
  lastPosition: { type: Number, default: 0 },
});
const PlaybackHistory = mongoose.model("PlaybackHistory", PlaybackHistorySchema);

// Middleware logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Middleware pour vérifier JWT
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
      followers: [],
      following: [],
    });
    const token = jwt.sign({ uuid: newUser.uuid }, process.env.JWT_SECRET);
    res.json({ token, user: newUser });
  } catch (err) {
    console.error("Erreur inscription:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

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

app.get("/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uuid: req.userUuid }).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ROUTES UTILISATEURS
app.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Erreur récupération utilisateurs:", err);
    res.status(500).json({ error: "users" });
  }
});

app.post("/users/:userId/follow", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserUuid = req.userUuid;

    const currentUser = await User.findOne({ uuid: currentUserUuid });
    const isFollowing = currentUser.following.includes(userId);

    if (isFollowing) {
      await User.updateOne(
        { uuid: currentUserUuid },
        { $pull: { following: userId } }
      );
      await User.updateOne(
        { uuid: userId },
        { $pull: { followers: currentUserUuid } }
      );
      res.json({ message: "Unfollow réussi", action: "follows" });
    } else {
      await User.updateOne(
        { uuid: currentUserUuid },
        { $addToSet: { following: userId } }
      );
      await User.updateOne(
        { uuid: userId },
        { $addToSet: { followers: currentUserUuid } }
      );
      res.json({ message: "Follow réussi", action: "follows" });
    }
  } catch (err) {
    console.error("Erreur follow/unfollow:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ROUTES PUBLICATION
app.post(
  "/publications",
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
        return res.status(400).json({ error: "erreur" });

      const audioPath = req.files["audio"][0].path;
      const imagePath = req.files["image"][0].path;
      const videoPath = req.files?.["video"]?.[0]?.path || "";

      const publication = await Publication.create({
        userUuid: req.userUuid,
        title,
        content,
        audioPath,
        imagePath,
        videoPath,
        likes: [],
        playCount: 0,
        authorPlayCount: 0,
        playHistory: [],
      });

      res.json({ publication });
    } catch (err) {
      console.error("Erreur création publication:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

app.get("/publications", async (req, res) => {
  try {
    const publications = await Publication.find().sort({ createdAt: -1 });
    const userUuids = publications.map((p) => p.userUuid);
    const users = await User.find({ uuid: { $in: userUuids } });

    let currentUserUuid = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserUuid = decoded.uuid;
      } catch (err) {
        console.error("Token invalide pour récupération des likes:", err);
      }
    }

    const result = publications.map((pub) => {
      const user = users.find((u) => u.uuid === pub.userUuid);
      return {
        id: pub._id,
        title: pub.title,
        content: pub.content,
        audioUrl: pub.audioPath
          ? `${req.protocol}://${req.get("host")}/${pub.audioPath}`
          : null,
        imageUrl: pub.imagePath
          ? `${req.protocol}://${req.get("host")}/${pub.imagePath}`
          : null,
        videoUrl: pub.videoPath
          ? `${req.protocol}://${req.get("host")}/${pub.videoPath}`
          : null,
        username: user ? user.name : "Inconnu",
        userUuid: pub.userUuid,
        createdAt: pub.createdAt,
        likes: pub.likes.length,
        playCount: pub.playCount || 0,
        authorPlayCount: pub.authorPlayCount || 0,
        likedByUser: currentUserUuid ? pub.likes.includes(currentUserUuid) : false,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Erreur récupération publications:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/publications/:id/like", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserUuid = req.userUuid;

    const publication = await Publication.findById(id);
    if (!publication)
      return res.status(404).json({ error: "Publication non trouvée" });

    const hasLiked = publication.likes.includes(currentUserUuid);

    if (hasLiked) {
      await Publication.updateOne(
        { _id: id },
        { $pull: { likes: currentUserUuid } }
      );
      res.json({ message: "Like retiré", action: "unlike" });
    } else {
      await Publication.updateOne(
        { _id: id },
        { $addToSet: { likes: currentUserUuid } }
      );
      res.json({ message: "Like ajouté", action: "like" });
    }
  } catch (err) {
    console.error("Erreur like/unlike:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/publications/:id/play", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userUuid } = req;
    const { isManual, weight = 1 } = req.body;

    const publication = await Publication.findById(id);
    if (!publication)
      return res.status(404).json({ error: "Publication non trouvée" });

    // Vérifier doublon
    const recentPlay = publication.playHistory.find(
      (play) => play.userUuid === userUuid && (Date.now() - new Date(play.timestamp)) / (1000 * 60 * 60) < 24
    );
    if (recentPlay)
      return res.json({ message: "Lecture ignorée (doublon)" });

    // Ajouter à l'historique
    const playEntry = {
      userUuid,
      timestamp: new Date(),
      weight,
    };

    // Incrémenter le compteur
    const updateField = publication.userUuid === userUuid ? "authorPlayCount" : "playCount";
    await Publication.updateOne(
      { _id: id },
      {
        $inc: { [updateField]: weight },
        $push: { playHistory: playEntry },
      }
    );

    res.json({ message: "Lecture enregistrée" });
  } catch (err) {
    console.error("Erreur enregistrement lecture:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/playback/:pubId", verifyToken, async (req, res) => {
  try {
    const { pubId } = req.params;
    const { lastPosition } = req.body;
    const { userUuid } = req;

    await PlaybackHistory.updateOne(
      { userUuid, pubId },
      { $set: { lastPosition } },
      { upsert: true }
    );
    res.json({ message: "Historique de lecture mis à jour" });
  } catch (err) {
    console.error("Erreur mise à jour historique:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/playback/:pubId", verifyToken, async (req, res) => {
  try {
    const { pubId } = req.params;
    const { userUuid } = req;

    const history = await PlaybackHistory.findOne({ userUuid, pubId });
    res.json({ lastPosition: history ? history.lastPosition : 0 });
  } catch (err) {
    console.error("Erreur récupération historique:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/publications/:id", verifyToken, async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) return res.status(404).json({ error: "Publication non trouvée" });

    if (pub.userUuid !== req.userUuid)
      return res.status(403).json({ error: "Interdit: pas propriétaire" });

    if (pub.audioPath && fs.existsSync(pub.audioPath))
      fs.unlinkSync(pub.audioPath);
    if (pub.imagePath && fs.existsSync(pub.imagePath))
      fs.unlinkSync(pub.imagePath);
    if (pub.videoPath && fs.exists(pub.videoPath))
      fs.unlinkSync(pub.videoPath);

    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: "Publication supprimée" });
  } catch (err) {
    console.error("Erreur suppression:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 Serveur en ligne sur http://localhost:${PORT}`);
});
