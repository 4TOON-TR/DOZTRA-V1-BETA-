const socket = io();
let roomId = null;
let playerSymbol = null;
let currentTurn = null;
let gameOver = false;
let board = Array(9).fill(null);

// نمایش پیام خطا
socket.on('error', (msg) => {
    alert(msg);
});

// ایجاد اتاق جدید
function createRoom() {
    socket.emit('create-room');
}

// دریافت کد اتاق
socket.on('room-created', (id) => {
    roomId = id;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('roomCode').textContent = `🏠 کد اتاق: ${id}`;
    document.getElementById('status').textContent = 'در انتظار بازیکن دوم...';
    setupBoard();
});

// پیوستن به اتاق
function joinRoom() {
    const input = document.getElementById('roomInput');
    roomId = input.value.trim();
    if (!roomId) {
        alert('لطفاً کد اتاق را وارد کن!');
        return;
    }
    socket.emit('join-room', roomId);
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('roomCode').textContent = `🏠 اتاق: ${roomId}`;
    setupBoard();
}

// دریافت علامت بازیکن
socket.on('player-assigned', (symbol) => {
    playerSymbol = symbol;
    document.getElementById('status').textContent = `تو علامت ${symbol} هستی`;
});

// شروع بازی
socket.on('game-start', (data) => {
    board = data.board;
    currentTurn = data.currentTurn;
    gameOver = false;
    renderBoard();
    updateStatus();
});

// حرکت انجام شد
socket.on('move-made', (data) => {
    board = data.board;
    currentTurn = data.currentTurn;
    renderBoard();
    updateStatus();
});

// بازی تمام شد
socket.on('game-over', (data) => {
    gameOver = true;
    board = data.board;
    renderBoard();
    
    let message = '';
    if (data.winner === 'draw') {
        message = '🤝 مساوی شد!';
    } else if (data.winner === playerSymbol) {
        message = '🎉 تو برنده شدی!';
    } else {
        message = '😢 حریف برنده شد!';
    }
    document.getElementById('status').textContent = message;
    document.getElementById('resetBtn').style.display = 'inline-block';
    
    // هایلایت برنده
    highlightWinner();
});

// ریست بازی
socket.on('game-reset', (data) => {
    board = data.board;
    currentTurn = data.currentTurn;
    gameOver = false;
    renderBoard();
    updateStatus();
    document.getElementById('resetBtn').style.display = 'none';
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('win-cell'));
});

// بازیکن قطع شد
socket.on('player-left', (msg) => {
    alert(msg);
    location.reload();
});

// تنظیم تخته
function setupBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        boardElement.appendChild(cell);
    }
}

// رندر تخته
function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, i) => {
        cell.textContent = board[i] || '';
        if (board[i]) {
            cell.classList.add('taken');
        } else {
            cell.classList.remove('taken');
        }
    });
}

// کلیک روی خانه
function handleCellClick(index) {
    if (gameOver) return;
    if (!playerSymbol) return;
    if (socket.id !== currentTurn) {
        alert('نوبت تو نیست!');
        return;
    }
    if (board[index] !== null) return;
    
    socket.emit('make-move', { roomId, index });
}

// بروزرسانی وضعیت
function updateStatus() {
    if (gameOver) return;
    const isMyTurn = socket.id === currentTurn;
    document.getElementById('status').textContent = isMyTurn ? 
        '⏰ نوبت توست!' : 
        '⏳ منتظر حرکت حریف...';
}

// ریست بازی
function resetGame() {
    socket.emit('reset-game', roomId);
}

// هایلایت برنده
function highlightWinner() {
    const winLines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    const cells = document.querySelectorAll('.cell');
    for (const line of winLines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            cells[a].classList.add('win-cell');
            cells[b].classList.add('win-cell');
            cells[c].classList.add('win-cell');
            break;
        }
    }
}