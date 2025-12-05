// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();

// --- MIDDLEWARES ---
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'CHANGE_THIS_SESSION_SECRET',
  resave: false,
  saveUninitialized: true
}));

// Vue + fichiers statiques
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- DB SQLite pour la salle 4 ---
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      secret_note TEXT
    )
  `);

  const stmt = db.prepare("INSERT INTO books (title, secret_note) VALUES (?, ?)");
  stmt.run("Grimoire des Ombres", "Mot de passe porte finale: DARK-PORTAL-77");
  stmt.run("Manuel du Sorcier Réseau", "Ne jamais exposer le port 22");
  stmt.run("Guide du JWT Maudit", "SECRET_JWT=123");
  stmt.finalize();
});

// --- JWT secret FAIBLE (exprès) ---
const WEAK_JWT_SECRET = "123";

// --- Init session de jeu ---
app.use((req, res, next) => {
  if (!req.session.game) {
    req.session.game = {
      room1Done: false,
      room2Done: false,
      room3Done: false,
      room4Done: false,
      room5Done: false
    };
  }
  res.locals.game = req.session.game; // dispo dans les templates
  next();
});

// ---------- ROUTES ----------

// Hall
app.get('/', (req, res) => {
  res.render('hall');
});

// ---------- SALLE 1 : JSON / Config Injection ----------
app.get('/room1', (req, res) => {
  const defaultConfig = {
    username: "aventurier",
    score: 0,
    level: 1,
    isAdmin: false
  };
  res.render('room1', { defaultConfig });
});

app.post('/room1', (req, res) => {
  let userConfig;
  try {
    userConfig = JSON.parse(req.body.jsonInput || '{}');
  } catch (e) {
    return res.render('error', {
      title: 'Salle 1 – Erreur JSON',
      message: 'JSON invalide : ' + e.message,
      backLink: '/room1'
    });
  }

  const defaultConfig = {
    username: "aventurier",
    score: 0,
    level: 1,
    isAdmin: false
  };

  // ❌ VULNÉRABLE : fusion naïve -> l'utilisateur peut écraser des champs sensibles
  const merged = Object.assign({}, defaultConfig, userConfig);

  if (merged.isAdmin === true) {
    req.session.game.room1Done = true;
  }

  res.render('room1_result', {
    merged,
    isAdmin: merged.isAdmin === true
  });
});

// ---------- SALLE 2 : XSS DOM ----------
app.get('/room2', (req, res) => {
  res.render('room2');
});

// Endpoint appelé par le JS quand la XSS appelle window.salle2Win()
app.post('/room2/win', (req, res) => {
  req.session.game.room2Done = true;
  res.status(204).end();
});

// ---------- SALLE 3 : JWT secret faible ----------
app.get('/room3', (req, res) => {
  const demoToken = jwt.sign(
    { role: 'player', level: 1 },
    WEAK_JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.render('room3', { demoToken });
});

app.post('/room3', (req, res) => {
  const token = req.body.token || '';
  let decoded;
  try {
    decoded = jwt.verify(token, WEAK_JWT_SECRET);
  } catch (e) {
    return res.render('error', {
      title: 'Salle 3 – Token invalide',
      message: 'Erreur de vérification : ' + e.message,
      backLink: '/room3'
    });
  }

  let success = false;
  if (decoded.role === 'master' && decoded.level === 3) {
    req.session.game.room3Done = true;
    success = true;
  }

  res.render('room3_result', { decoded, success });
});

// ---------- SALLE 4 : SQL Injection ----------
app.get('/room4', (req, res) => {
  res.render('room4');
});

app.get('/room4/search', (req, res) => {
  const q = req.query.q || '';

  // ❌ VULNÉRABLE : concaténation directe
  const sql = `SELECT id, title, secret_note FROM books WHERE title LIKE '%${q}%'`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.render('error', {
        title: 'Salle 4 – Erreur SQL',
        message: err.message,
        backLink: '/room4'
      });
    }

    for (const r of rows) {
      if (r.secret_note && r.secret_note.includes('DARK-PORTAL-77')) {
        req.session.game.room4Done = true;
        break;
      }
    }

    res.render('room4_results', { sql, rows });
  });
});

// ---------- SALLE 5 : Path Traversal / File Disclosure ----------
app.get('/room5', (req, res) => {
  res.render('room5');
});

app.get('/room5/read', (req, res) => {
  const file = req.query.file || '';

  const baseDir = path.join(__dirname, 'secret');
  const targetPath = path.join(baseDir, file);

  fs.readFile(targetPath, 'utf8', (err, data) => {
    if (err) {
      return res.render('room5_result', {
        requested: file,
        targetPath,
        error: err.message,
        content: null,
        traversed: false
      });
    }

    const traversed = !targetPath.startsWith(baseDir);

    if (file === 'flag-room5.txt' || traversed) {
      req.session.game.room5Done = true;
    }

    res.render('room5_result', {
      requested: file,
      targetPath,
      error: null,
      content: data,
      traversed
    });
  });
});

// ---------- SALLE FINALE ----------
app.get('/final', (req, res) => {
  const g = req.session.game;
  const allDone = g.room1Done && g.room2Done && g.room3Done && g.room4Done && g.room5Done;

  if (!allDone) {
    return res.render('final', { locked: true });
  }

  res.render('final', { locked: false });
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404',
    message: 'Page introuvable',
    backLink: '/'
  });
});

// --- Lancer le serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cyber Escape Game sur port ${PORT}`);
});
