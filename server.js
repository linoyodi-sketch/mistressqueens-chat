const Ably = require('ably');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// המפתח שלך
const ABLY_API_KEY = 'LQMvpw.UUJZZw:VsdRVinvYPA4OF48UcYBOU6klbIhEp-uzmJ3gKnxD2w';
const realtime = new Ably.Realtime(ABLY_API_KEY);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Martef Server is Live and Ready!');
});

app.get('/auth', (req, res) => {
    const clientId = req.query.userId || 'guest_' + Math.random().toString(36).substr(2, 9);
    const capability = { "*": ["publish", "subscribe", "presence"] };

    realtime.auth.createTokenRequest({ clientId: clientId, capability: capability }, (err, tokenRequest) => {
        if (err) {
            res.status(500).send("Error: " + JSON.stringify(err));
        } else {
            res.json(tokenRequest);
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
