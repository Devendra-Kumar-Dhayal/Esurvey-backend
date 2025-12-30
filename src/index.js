require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const telemetryRoutes = require('./routes/telemetry.routes');
const adminRoutes = require('./routes/admin.routes');
const selectionRoutes = require('./routes/selection.routes');
const qrRoutes = require('./routes/qr.routes');
const { sendError } = require('./utils/response');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static admin panel
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/selection', selectionRoutes);
app.use('/api/qr', qrRoutes);

app.use((req, res) => {
  sendError(res, 'Route not found', 404);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  sendError(res, 'Internal server error', 500);
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
