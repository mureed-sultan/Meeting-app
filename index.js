// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

let onlineUsers = {};

io.on('connection', (socket) => {
    socket.on('join', (name) => {
        onlineUsers[socket.id] = name;
        io.emit('user-list', Object.entries(onlineUsers));
    });

    socket.on('call-user', ({ from, to, name }) => {
        io.to(to).emit('call-made', { from, name });
    });

    socket.on('answer-call', ({ from, to }) => {
        io.to(to).emit('call-answered', { from });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('user-list', Object.entries(onlineUsers));
    });
});

server.listen(3001, () => {
    console.log('Server is running on port 3001');
});
