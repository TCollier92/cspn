const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use environment variable or default to 3000

app.get('/', (req, res) => {
  console.log('request received');  
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
