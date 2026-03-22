const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const users = new Map();
function now() { return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }
app.get('/', (req, res) => res.json({ status: 'ok', users: users.size }));
io.on('connection', (socket) => {
  socket.on('user_join', (data) => {
    const name = String(data.name || 'אורחת').trim().substring(0, 20);
    const room = ['lobby','queens','slaves','flirt','market'].includes(data.room) ? data.room : 'lobby';
    const user = { socketId: socket.id, name, role: data.role || 'guest', isGuest: !!data.isGuest, room };
    users.set(socket.id, user);
    socket.join(room);
    io.to(room).emit('system_message', { text: '✦ ' + name + ' נכנסה' });
    io.emit('users_update', Array.from(users.values()));
  });
  socket.on('switch_room', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    const newRoom = ['lobby','queens','slaves','flirt','market'].includes(data.room) ? data.room : 'lobby';
    socket.leave(user.room);
    socket.join(newRoom);
    user.room = newRoom;
    users.set(socket.id, user);
    io.emit('users_update', Array.from(users.values()));
  });
  socket.on('room_message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    const text = String(data.text || '').trim().substring(0, 500);
    if (!text) return;
    io.to(user.room).emit('room_message', { socketId: socket.id, name: user.name, role: user.role, text, time: now() });
  });
  socket.on('private_message', (data) => {
    const sender = users.get(socket.id);
    if (!sender) return;
    const text = String(data.text || '').trim().substring(0, 500);
    if (!text) return;
    io.to(data.toSocketId).emit('private_message', { fromSocketId: socket.id, fromName: sender.name, text, time: now() });
  });
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) { users.delete(socket.id); io.emit('users_update', Array.from(users.values())); }
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Running on port ' + PORT));
