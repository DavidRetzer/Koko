import express from 'express';
import chatProxy from './api/chat.js'; // Import the logic from your chat.js

const app = express();
const PORT = 3000;

app.use(express.json()); // Middleware to parse JSON body

// ----------------------------------------------------
// IMPORTANT: CORS setup for local testing
// ----------------------------------------------------
app.use((req, res, next) => {
    // Allow access from our local test HTML file
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8080'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chatbot-Secret');
    next();
});

// Route the request to your chat logic
app.all('/api/chat', chatProxy); 
// We use app.all to handle both POST and OPTIONS (preflight) requests.

app.listen(PORT, () => {
  console.log(`✅ Local Proxy running at http://localhost:${PORT}/`);
  console.log(`   (You should use the URL http://localhost:${PORT}/api/chat in your test code.)`);
});