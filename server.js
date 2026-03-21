const express = require('express');const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }

});

const users = new Map();

function now() {
    return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

app.get('/', (req, res) => {
    res.json({ status: 'ok', users: users.size });
});

io.on('connection', (socket) => {

    socket.on('user_join', (data) => {
        const name = String(data.name || 'אורחת').trim().substring(0, 20);
        const room = ['lobby','queens','slaves','flirt','market'].includes(data.room) ? data.room : 'lobby';
        
        const user = {
            socketId: socket.id,
            name: name,
            role: data.role || 'guest',
            isGuest: data.isGuest || true,
            room: room
        };
        
        users.set(socket.id, user);
        socket.join(room);
        
        io.to(room).emit('system_message', { text: '✦ ' + name + ' נכנסה לחדר' });
        io.emit('users_update', Array.from(users.values()));
    });

    socket.on('switch_room', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const newRoom = ['lobby','queens','slaves','flirt','market'].includes(data.room) ? data.room : 'lobby';
        const oldRoom = user.room;
        
        socket.leave(oldRoom);
        io.to(oldRoom).emit('system_message', { text: '✦ ' + user.name + ' יצאה מהחדר' });
        
        socket.join(newRoom);
        user.room = newRoom;
        users.set(socket.id, user);
        
        io.to(newRoom).emit('system_message', { text: '✦ ' + user.name + ' נכנסה לחדר' });
        io.emit('users_update', Array.from(users.values()));
    });

    socket.on('room_message', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const text = String(data.text || '').trim().substring(0, 500);
        if (!text) return;
        
        io.to(user.room).emit('room_message', {
            socketId: socket.id,
            name: user.name,
            role: user.role,
            text: text,
            time: now(),
            room: user.room
        });
    });

    socket.on('private_message', (data) => {
        const sender = users.get(socket.id);
        if (!sender) return;
        
        const text = String(data.text || '').trim().substring(0, 500);
        if (!text) return;
        
        io.to(data.toSocketId).emit('private_message', {add_action('wp_enqueue_scripts','mc2_assets');
function mc2_assets(){
    if(is_page_template('page-martef-v2.php')){
        wp_enqueue_style('mc2css',get_template_directory_uri().'/assets/css/martef-v2.css');
        wp_enqueue_script('mc2js',get_template_directory_uri().'/assets/js/martef-v2.js',array(),'2.0',true);
    }
}
            fromSocketId: socket.id,
            fromName: sender.name,
            text: text,
            time: now()
        });
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            io.to(user.room).emit('system_message', { text: '✦ ' + user.name + ' יצאה' });
            users.delete(socket.id);
            io.emit('users_update', Array.from(users.values()));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
