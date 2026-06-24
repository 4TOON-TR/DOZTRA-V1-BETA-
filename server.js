const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// ذخیره‌ی اطلاعات اتاق‌ها
const rooms = {};

io.on('connection', (socket) => {
    console.log('کاربر جدید وصل شد:', socket.id);

    // ایجاد اتاق جدید
    socket.on('create-room', () => {
        const roomId = Math.random().toString(36).substring(2, 8);
        socket.join(roomId);
        rooms[roomId] = {
            players: [socket.id],
            board: Array(9).fill(null),
            currentTurn: socket.id,
            gameOver: false,
            winner: null
        };
        socket.emit('room-created', roomId);
        socket.emit('player-assigned', 'X');
        console.log(`اتاق ${roomId} ایجاد شد توسط ${socket.id}`);
    });

    // پیوستن به اتاق موجود
    socket.on('join-room', (roomId) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', 'اتاق وجود ندارد!');
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('error', 'اتاق پر است!');
            return;
        }

        socket.join(roomId);
        room.players.push(socket.id);
        socket.emit('player-assigned', 'O');
        
        // به همه بگو بازی شروع شد
        io.to(roomId).emit('game-start', {
            board: room.board,
            currentTurn: room.currentTurn,
            players: room.players
        });
        console.log(`کاربر ${socket.id} به اتاق ${roomId} پیوست`);
    });

    // حرکت جدید
    socket.on('make-move', ({ roomId, index }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (room.gameOver) return;
        if (room.currentTurn !== socket.id) return;
        if (room.board[index] !== null) return;

        // انجام حرکت
        const playerSymbol = room.players[0] === socket.id ? 'X' : 'O';
        room.board[index] = playerSymbol;
        
        // بررسی برنده
        const winner = checkWinner(room.board);
        if (winner) {
            room.gameOver = true;
            room.winner = winner;
            io.to(roomId).emit('game-over', { winner, board: room.board });
            return;
        }

        // بررسی تساوی
        if (room.board.every(cell => cell !== null)) {
            room.gameOver = true;
            io.to(roomId).emit('game-over', { winner: 'draw', board: room.board });
            return;
        }

        // تغییر نوبت
        room.currentTurn = room.players.find(id => id !== socket.id);
        io.to(roomId).emit('move-made', {
            board: room.board,
            currentTurn: room.currentTurn
        });
    });

    // ریست بازی
    socket.on('reset-game', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;
        room.board = Array(9).fill(null);
        room.gameOver = false;
        room.winner = null;
        room.currentTurn = room.players[0];
        io.to(roomId).emit('game-reset', {
            board: room.board,
            currentTurn: room.currentTurn
        });
    });

    // قطع ارتباط
    socket.on('disconnect', () => {
        console.log('کاربر قطع شد:', socket.id);
        // پاک کردن اتاق‌های خالی
        for (const [roomId, room] of Object.entries(rooms)) {
            if (room.players.includes(socket.id)) {
                io.to(roomId).emit('player-left', 'بازیکنی قطع شد!');
                delete rooms[roomId];
                console.log(`اتاق ${roomId} حذف شد`);
            }
        }
    });
});

// تابع بررسی برنده
function checkWinner(board) {
    const lines = [
        [0,1,2], [3,4,5], [6,7,8], // ردیف‌ها
        [0,3,6], [1,4,7], [2,5,8], // ستون‌ها
        [0,4,8], [2,4,6] // اقطار
    ];
    for (const line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
});