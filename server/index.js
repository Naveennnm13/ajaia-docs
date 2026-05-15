const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/presence', require('./routes/presence'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
