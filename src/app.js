const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('TGCF Backend');
});

// Mount auth routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// Mount telegram routes
const telegramRoutes = require('./routes/telegram.routes');
app.use('/api/telegram', telegramRoutes);

// Mount config routes
const configRoutes = require('./routes/config.routes');
app.use('/api/config', configRoutes); // For main config
app.use('/api/plugins', configRoutes); // For plugin listings and their settings (as per refined routing)

// Mount TGCF control routes
const tgcfRoutes = require('./routes/tgcf.routes');
app.use('/api/tgcf', tgcfRoutes);


// Basic error handling middleware
app.use((err, req, res, next) => {
  logger.error({ err, stack: err.stack }, 'Unhandled error caught by error handling middleware.');
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
