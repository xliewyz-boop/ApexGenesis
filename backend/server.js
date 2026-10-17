const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new Database(process.env.DB_FILE || './database.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS followers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id),
    UNIQUE(follower_id, following_id)
  );
`);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const info = stmt.run(username, email, hashedPassword);

    res.status(201).json({ message: 'User created', userId: info.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a post (protected)
app.post('/api/posts', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const stmt = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)');
    const info = stmt.run(req.user.userId, content);

    res.status(201).json({ message: 'Post created', postId: info.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all posts (for news feed)
app.get('/api/posts', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT posts.id, posts.content, posts.created_at, users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);
    const posts = stmt.all();
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts for a specific user
app.get('/api/posts/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const stmt = db.prepare(`
      SELECT posts.id, posts.content, posts.created_at, users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      WHERE posts.user_id = ?
      ORDER BY posts.created_at DESC
    `);
    const posts = stmt.all(userId);
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow a user
app.post('/api/follow/:userIdToFollow', authenticateToken, (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = parseInt(req.params.userIdToFollow);

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Check if the user to follow exists
    const userToFollow = db.prepare('SELECT * FROM users WHERE id = ?').get(followingId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    const existing = db.prepare('SELECT * FROM followers WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);
    if (existing) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Insert follower relationship
    const stmt = db.prepare('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)');
    stmt.run(followerId, followingId);

    res.status(201).json({ message: 'Now following user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's followers
app.get('/api/users/:userId/followers', (req, res) => {
  try {
    const { userId } = req.params;
    const stmt = db.prepare(`
      SELECT users.id, users.username, users.email
      FROM followers
      JOIN users ON followers.follower_id = users.id
      WHERE followers.following_id = ?
    `);
    const followers = stmt.all(userId);
    res.json(followers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's following
app.get('/api/users/:userId/following', (req, res) => {
  try {
    const { userId } = req.params;
    const stmt = db.prepare(`
      SELECT users.id, users.username, users.email
      FROM followers
      JOIN users ON followers.following_id = users.id
      WHERE followers.follower_id = ?
    `);
    const following = stmt.all(userId);
    res.json(following);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));