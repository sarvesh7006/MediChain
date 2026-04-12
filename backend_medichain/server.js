require('dotenv').config();
const express     = require('express');
const connectDB    = require('./config/db');
const dotenv       = require('dotenv');

// Load env vars
dotenv.config();

connectDB();
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs          = require('fs');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const decentralizedRoutes        = require('./routes/decentralizedRoutes');
const blockchainService          = require('./services/blockchainService');

const app = express();

// ── Blockchain init ──────────────────────────────────────────────────────────
blockchainService.initialize();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow requests from:
//  - file:// origins (HTML pages opened directly in browser)
//  - localhost dev servers on any common port
const allowedOrigins = [
  'null',           // file:// pages send Origin: null
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5500',
  'http://localhost:5001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5001',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) OR from allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
}));

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use(limiter);

// ── Permissive headers for CDN assets (dev) ─────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

// ── Health check (must be before static middleware) ──────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:          'MediChain Backend Online',
    mode:            blockchainService.isMockMode ? 'MOCK' : 'BLOCKCHAIN',
    blockchainReady: blockchainService.isInitialized,
    timestamp:       new Date().toISOString(),
  });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api/v1', decentralizedRoutes);
// User routes for patient registration
app.use('/api/v1/users', require('./routes/userRoutes'));

// ── Serve uploaded files statically (so frontend can preview them) ───────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Frontend resolver (serve files before static to avoid 403) ───────────────
const frontendRoot = path.join(__dirname, '..', 'Frontend');
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const directPath = path.join(frontendRoot, req.path);
  const indexPath  = path.join(frontendRoot, req.path, 'index.html');
  const landing    = path.join(frontendRoot, 'landing_page', 'landingpage.html');

  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.sendFile(landing);
});

// ── Serve frontend statically (assets) ───────────────────────────────────────
app.use('/Frontend', express.static(frontendRoot));
app.use('/', express.static(frontendRoot));



// ── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('  MediChain Backend running on http://localhost:' + PORT);
  console.log('  Health check : http://localhost:' + PORT + '/health');
  console.log('  API base     : http://localhost:' + PORT + '/api/v1');
  console.log('');
});
