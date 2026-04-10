require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const decentralizedRoutes = require('./routes/decentralizedRoutes');
const blockchainService = require('./services/blockchainService');

const app = express();

// Initialize Blockchain Service when server starts
blockchainService.initialize();

// Middleware
app.use(helmet()); 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP logging

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, 
});
app.use(limiter);

// Decentralized Web3 Routes
app.use('/api/v1', decentralizedRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Decentralized Backend is Online', blockchainInit: blockchainService.isInitialized });
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
