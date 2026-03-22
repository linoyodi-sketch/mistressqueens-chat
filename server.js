const Ably = require('ably');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// המפתח האישי שלך
const ABLY_API_KEY = 'LQMvpw.UUJZZw:VsdRVinvYPA4OF48UcYBOU6klbIhEp-uzmJ3gKnxD2w';
const realtime = new Ably.Realtime(ABLY_API_KEY);

app.use(cors()); // מאפשר לאתר וורדפרס שלך לדבר עם השרת הזה
app.use(express.json());

// דף בית קטן כדי לדעת שהשרת חי
app.get('/', (req, res) => {
    res.send('Martef Server is Live and Ready!');
});

// מנגנון זיהוי: יוצר טוקן זמני לכל משתמש (רשום או אורח)
app.get('/auth', (req, res) => {
    const clientId = req.query.userId || 'guest_' + Math.random().toString(36).substr(2, 9);
    
    // הרשאות: מותר לקרוא, לכתוב ולראות מי מחובר
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
    console.log(Server running on port ${port});
});
