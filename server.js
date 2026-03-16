/**
 * שרת צ'אט - מרתף השליטה
 * Node.js + Socket.io + חיבור לוורדפרס
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ← שנה את הכתובת לכתובת האתר שלך
const YOUR_SITE = 'https://mistressqueens.com';

const io = new Server(server, {
  cors: {
    origin: YOUR_SITE,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: YOUR_SITE }));
app.use(express.json());

// שמירת ההודעות בזיכרון (מקסימום 200 הודעות אחרונות לכל חדר)
const rooms = {
  'גלובל':    { messages: [], users: new Map() },
  'מלכות':    { messages: [], users: new Map() },
  'עבדים':    { messages: [], users: new Map() },
  'פלירט':    { messages: [], users: new Map() },
  'הכרויות':  { messages: [], users: new Map() },
};

const MAX_MESSAGES = 200;

// ── נקודת קצה לאימות מול וורדפרס ──────────────────────────────
// וורדפרס שולח את פרטי המשתמש המחובר לכאן
app.post('/auth', (req, res) => {
  const { wp_user_id, username, role, nonce } = req.body;

  // וידוא בסיסי שהבקשה הגיעה מוורדפרס
  if (!wp_user_id || !username || !nonce) {
    return res.status(401).json({ error: 'לא מורשה' });
  }

  // קביעת תפקיד בצ'אט לפי תפקיד בוורדפרס
  const chatRole = role === 'administrator' || role === 'mistress' ? 'מלכה' : 'חבר';

  res.json({
    ok: true,
    user: {
      id: wp_user_id,
      name: username,
      role: chatRole,
      isQueen: chatRole === 'מלכה'
    }
  });
});

// בדיקת תקינות השרת
app.get('/health', (req, res) => res.json({ status: 'פעיל ✓' }));

// ── לוגיקת Socket.io ────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentUser = null;
  let currentRoom = null;

  // משתמש מצטרף לצ'אט עם הפרטים מוורדפרס
  socket.on('join', ({ user, room }) => {
    currentUser = user;
    currentRoom = room || 'גלובל';

    if (!rooms[currentRoom]) currentRoom = 'גלובל';

    socket.join(currentRoom);
    rooms[currentRoom].users.set(socket.id, currentUser);

    // שליחת 50 הודעות אחרונות למשתמש החדש
    const history = rooms[currentRoom].messages.slice(-50);
    socket.emit('history', history);

    // עדכון רשימת המחוברים לכולם בחדר
    broadcastUsers(currentRoom);

    // הודעת מערכת - הצטרף
    const sysMsg = {
      type: 'system',
      text: `${currentUser.name} הצטרף לצ'אט`,
      time: getTime(),
      room: currentRoom
    };
    io.to(currentRoom).emit('system_message', sysMsg);
  });

  // שינוי חדר
  socket.on('change_room', ({ room }) => {
    if (!rooms[room]) return;

    if (currentRoom) {
      rooms[currentRoom].users.delete(socket.id);
      broadcastUsers(currentRoom);
      socket.leave(currentRoom);
    }

    currentRoom = room;
    socket.join(currentRoom);
    rooms[currentRoom].users.set(socket.id, currentUser);

    const history = rooms[currentRoom].messages.slice(-50);
    socket.emit('history', history);
    broadcastUsers(currentRoom);
  });

  // קבלת הודעה חדשה
  socket.on('message', ({ text, replyTo }) => {
    if (!currentUser || !currentRoom || !text?.trim()) return;
    if (text.length > 500) return; // הגבלת אורך

    const msg = {
      id: Date.now() + '_' + socket.id,
      type: 'message',
      user: currentUser,
      text: text.trim(),
      replyTo: replyTo || null,
      time: getTime(),
      room: currentRoom,
      reactions: {}
    };

    // שמירה בהיסטוריה
    rooms[currentRoom].messages.push(msg);
    if (rooms[currentRoom].messages.length > MAX_MESSAGES) {
      rooms[currentRoom].messages.shift();
    }

    // שליחה לכולם בחדר
    io.to(currentRoom).emit('message', msg);
  });

  // תגובת אימוג'י
  socket.on('react', ({ msgId, emoji }) => {
    if (!currentRoom || !emoji) return;
    const msg = rooms[currentRoom].messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions[emoji]) msg.reactions[emoji] = new Set();
    const set = msg.reactions[emoji];

    if (set.has(socket.id)) {
      set.delete(socket.id);
    } else {
      set.add(socket.id);
    }

    // שולח את הספירות (לא את ה-Set עצמו)
    const reactionsCount = {};
    for (const [em, s] of Object.entries(msg.reactions)) {
      if (s.size > 0) reactionsCount[em] = s.size;
    }

    io.to(currentRoom).emit('reaction_update', { msgId, reactions: reactionsCount });
  });

  // אינדיקטור הקלדה
  let typingTimeout;
  socket.on('typing', () => {
    if (!currentUser || !currentRoom) return;
    socket.to(currentRoom).emit('typing', { name: currentUser.name });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.to(currentRoom).emit('stop_typing', { name: currentUser.name });
    }, 2000);
  });

  // ניתוק
  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      rooms[currentRoom].users.delete(socket.id);
      broadcastUsers(currentRoom);

      const sysMsg = {
        type: 'system',
        text: `${currentUser.name} עזב את הצ'אט`,
        time: getTime(),
      };
      io.to(currentRoom).emit('system_message', sysMsg);
    }
  });
});

// פונקציות עזר
function broadcastUsers(room) {
  const users = Array.from(rooms[room].users.values());
  io.to(room).emit('users_update', users);
}

function getTime() {
  return new Date().toLocaleTimeString('he-IL', {
    hour: '2-digit', minute: '2-digit'
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✓ שרת הצ'אט פעיל על פורט ${PORT}`);
});
