// Backup: Add this to server.js if static files still don't work

app.get('/demo', (req, res) => {
  res.redirect('/demo/');
});

app.get('/demo/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-app', 'index.html'));
});

app.get('/demo/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-app', 'app.js'));
});