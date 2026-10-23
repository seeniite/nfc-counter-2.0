const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for counters
let counters = {
    a: 0,
    b: 0
};

// Store active Server-Sent Events (SSE) clients for real-time updates
let clients = [];

app.use(express.static(path.join(__dirname, 'public')));

// Function to broadcast updated counters to all connected browsers
function broadcastUpdate() {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(counters)}\n\n`);
    });
}

// Automatically reset counters at midnight every day
function scheduleMidnightReset() {
    const now = new Date();
    const nextMidnight = new Date(now);
    
    // Set target time to 00:00:00 (midnight) of the next day
    nextMidnight.setHours(24, 0, 0, 0);
    
    const timeUntilMidnight = nextMidnight - now;

    setTimeout(() => {
        // Reset counters back to 0
        counters.a = 0;
        counters.b = 0;
        console.log('Counters automatically reset at midnight!');
        
        // Push the reset count (0, 0) live to all connected web pages
        broadcastUpdate();

        // Schedule the next midnight reset for the following day
        scheduleMidnightReset();
    }, timeUntilMidnight);
}

// Start the midnight reset loop
scheduleMidnightReset();

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send current state immediately upon connection
    res.write(`data: ${JSON.stringify(counters)}\n\n`);

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

// Endpoint triggered when an NFC tag is scanned
app.get('/tap', (req, res) => {
    const tag = req.query.tag;

    if (tag === 'a') {
        counters.a += 1;
        broadcastUpdate();
        res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/"/></head><body>Tapped Tag A! Redirecting...</body></html>`);
    } else if (tag === 'b') {
        counters.b += 1;
        broadcastUpdate();
        res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/"/></head><body>Tapped Tag B! Redirecting...</body></html>`);
    } else {
        res.status(400).send('Invalid tag');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
