import gsap from 'gsap';

// --- Configuration ---
const STRATEGIES = {
    scholarsMate: {
        name: "Scholar's Mate",
        desc: "The fastest way to win for White! It attacks the weak f7 square using the Queen and Bishop.",
        moves: [
            { piece: 'P', color: 'w', from: [4, 1], to: [4, 3] },
            { piece: 'p', color: 'b', from: [4, 6], to: [4, 4] },
            { piece: 'Q', color: 'w', from: [3, 0], to: [7, 4] },
            { piece: 'n', color: 'b', from: [1, 7], to: [2, 5] },
            { piece: 'B', color: 'w', from: [5, 0], to: [2, 3] },
            { piece: 'n', color: 'b', from: [6, 7], to: [5, 5] },
            { piece: 'Q', color: 'w', from: [7, 4], to: [5, 6], capture: true }
        ]
    },
    theFork: {
        name: "The Knight's Fork",
        desc: "The Knight's superpower! It attacks the King and the Queen at the same time. White must save the King, and then we take the Queen!",
        moves: [
            { piece: 'P', color: 'w', from: [4, 1], to: [4, 3] },
            { piece: 'p', color: 'b', from: [4, 6], to: [4, 4] },
            { piece: 'N', color: 'w', from: [6, 0], to: [5, 2] },
            { piece: 'n', color: 'b', from: [1, 7], to: [2, 5] },
            { piece: 'N', color: 'w', from: [5, 2], to: [6, 4] },
            { piece: 'p', color: 'b', from: [7, 6], to: [7, 5] },
            { piece: 'N', color: 'w', from: [6, 4], to: [5, 6], capture: true },
        ]
    },
    backRankMate: {
        name: "Back Rank Mate",
        desc: "Don't let your King get trapped! Black's King cannot escape because his own pawns are in the way.",
        moves: [
            { piece: 'P', color: 'w', from: [4, 1], to: [4, 3] },
            { piece: 'p', color: 'b', from: [4, 6], to: [4, 4] },
            { piece: 'R', color: 'w', from: [0, 0], to: [0, 7], capture: true }
        ]
    }
};

// --- Piece Mappings ---
const piecesSVG = {
    'p': '♙', 'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

const piecesSVGDark = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
};

function getPieceChar(type, color) {
    if (color === 'w') return piecesSVG[type.toUpperCase()];
    return piecesSVGDark[type.toLowerCase()];
}

// --- State ---
let activeTab = 'learn';
let currentStrategyKey = 'scholarsMate';
let currentMoveIndex = 0;
let isAnimating = false;
let game = null;
let stockfish = null;
let selectedSquare = null;

// --- Initialization ---
function init() {
    setupTabSwitching();
    initLearnMode();
    initCompeteMode();
}

function setupTabSwitching() {
    const learnBtn = document.getElementById('tab-learn');
    const competeBtn = document.getElementById('tab-compete');
    const learnView = document.getElementById('learn-view');
    const competeView = document.getElementById('compete-view');

    learnBtn.addEventListener('click', () => {
        activeTab = 'learn';
        learnBtn.classList.add('active');
        competeBtn.classList.remove('active');
        learnView.classList.remove('hidden');
        competeView.classList.add('hidden');
        resetAnimation();
    });

    competeBtn.addEventListener('click', () => {
        activeTab = 'compete';
        competeBtn.classList.add('active');
        learnBtn.classList.remove('active');
        competeView.classList.remove('hidden');
        learnView.classList.add('hidden');
        if (!game) startCompeteGame();
    });
}

// --- Utils ---
function initBoardDOM(elementId) {
    const board = document.getElementById(elementId);
    board.innerHTML = '';
    for (let r = 7; r >= 0; r--) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.className = `square ${(r + c) % 2 === 0 ? 'black' : 'white'}`;
            square.dataset.coord = `${c},${r}`;
            square.dataset.algebraic = String.fromCharCode(97 + c) + (r + 1);
            board.appendChild(square);
        }
    }
}

// --- Learning Mode Logic ---
function initLearnMode() {
    renderStrategyChips();
    initBoardDOM('svg-board-learn');
    updateStrategyInfo(); // Fill the name and description on load
    resetAnimation();

    document.getElementById('play-animation').addEventListener('click', playNextMove);
    document.getElementById('reset-animation').addEventListener('click', resetAnimation);
}

function renderStrategyChips() {
    const list = document.getElementById('strategy-list');
    list.innerHTML = '';
    Object.entries(STRATEGIES).forEach(([key, strategy]) => {
        const chip = document.createElement('div');
        chip.className = `strategy-chip ${key === currentStrategyKey ? 'active' : ''}`;
        chip.textContent = strategy.name;
        chip.onclick = () => selectStrategy(key);
        list.appendChild(chip);
    });
}

function setupInitialPiecesStatic(elementId) {
    const initial = [
        { type: 'R', c: 0, r: 0 }, { type: 'N', c: 1, r: 0 }, { type: 'B', c: 2, r: 0 }, { type: 'Q', c: 3, r: 0 }, { type: 'K', c: 4, r: 0 }, { type: 'B', c: 5, r: 0 }, { type: 'N', c: 6, r: 0 }, { type: 'R', c: 7, r: 0 },
        { type: 'P', c: 0, r: 1 }, { type: 'P', c: 1, r: 1 }, { type: 'P', c: 2, r: 1 }, { type: 'P', c: 3, r: 1 }, { type: 'P', c: 4, r: 1 }, { type: 'P', c: 5, r: 1 }, { type: 'P', c: 6, r: 1 }, { type: 'P', c: 7, r: 1 },
        { type: 'p', c: 0, r: 6 }, { type: 'p', c: 1, r: 6 }, { type: 'p', c: 2, r: 6 }, { type: 'p', c: 3, r: 6 }, { type: 'p', c: 4, r: 6 }, { type: 'p', c: 5, r: 6 }, { type: 'p', c: 6, r: 6 }, { type: 'p', c: 7, r: 6 },
        { type: 'r', c: 0, r: 7 }, { type: 'n', c: 1, r: 7 }, { type: 'b', c: 2, r: 7 }, { type: 'q', c: 3, r: 7 }, { type: 'k', c: 4, r: 7 }, { type: 'b', c: 5, r: 7 }, { type: 'n', c: 6, r: 7 }, { type: 'r', c: 7, r: 7 }
    ];

    const board = document.getElementById(elementId);
    initial.forEach(p => {
        const square = board.querySelector(`[data-coord="${p.c},${p.r}"]`);
        const piece = document.createElement('div');
        piece.className = 'piece';
        const color = p.type === p.type.toUpperCase() ? 'w' : 'b';
        piece.textContent = getPieceChar(p.type, color);
        piece.style.color = color === 'w' ? '#4f46e5' : '#1e293b';
        square.appendChild(piece);
    });
}

function selectStrategy(key) {
    if (isAnimating) return;
    currentStrategyKey = key;
    renderStrategyChips();
    updateStrategyInfo();
    resetAnimation();
}

function updateStrategyInfo() {
    const strategy = STRATEGIES[currentStrategyKey];
    document.getElementById('strategy-name').textContent = strategy.name;
    document.getElementById('strategy-desc').textContent = strategy.desc;
}

function playNextMove() {
    const moves = STRATEGIES[currentStrategyKey].moves;
    if (currentMoveIndex >= moves.length || isAnimating) return;

    const move = moves[currentMoveIndex];
    isAnimating = true;

    animateMove('svg-board-learn', move);
    currentMoveIndex++;
}

function animateMove(boardId, move) {
    const board = document.getElementById(boardId);
    const fromSq = board.querySelector(`[data-coord="${move.from[0]},${move.from[1]}"]`);
    const toSq = board.querySelector(`[data-coord="${move.to[0]},${move.to[1]}"]`);
    const piece = fromSq.querySelector('.piece');

    if (!piece) {
        isAnimating = false;
        return;
    }

    if (move.capture) {
        const opponentPiece = toSq.querySelector('.piece');
        if (opponentPiece) {
            gsap.to(opponentPiece, { scale: 0, opacity: 0, duration: 0.3, onComplete: () => opponentPiece.remove() });
        }
    }

    const fromRect = fromSq.getBoundingClientRect();
    const toRect = toSq.getBoundingClientRect();
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    gsap.to(piece, {
        x: dx,
        y: dy,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => {
            gsap.set(piece, { x: 0, y: 0 });
            toSq.appendChild(piece);
            isAnimating = false;
        }
    });
}

function resetAnimation() {
    currentMoveIndex = 0;
    isAnimating = false;
    initBoardDOM('svg-board-learn');
    setupInitialPiecesStatic('svg-board-learn');
}

// --- Compete Mode Logic ---
function initCompeteMode() {
    initBoardDOM('svg-board-compete');
    document.getElementById('ai-level').addEventListener('input', (e) => {
        document.getElementById('level-val').textContent = e.target.value;
    });
    document.getElementById('start-game').addEventListener('click', startCompeteGame);
    document.getElementById('undo-move').addEventListener('click', () => {
        if (game) {
            game.undo(); // Undo AI
            game.undo(); // Undo Player
            renderGame();
        }
    });
}

function startCompeteGame() {
    game = new Chess();
    initBoardDOM('svg-board-compete');
    renderGame();
    setupClickToMove();
    document.getElementById('game-status').textContent = "Your turn (White)";
}

function renderGame() {
    const board = document.getElementById('svg-board-compete');
    const squares = board.querySelectorAll('.square');
    squares.forEach(sq => {
        sq.innerHTML = '';
        const piece = game.get(sq.dataset.algebraic);
        if (piece) {
            const div = document.createElement('div');
            div.className = 'piece';
            div.textContent = getPieceChar(piece.type, piece.color);
            div.style.color = piece.color === 'w' ? '#4f46e5' : '#1e293b';
            sq.appendChild(div);
        }
    });

    if (selectedSquare) {
        const alg = selectedSquare.dataset.algebraic;
        // Find the new element because initBoardDOM might have recreated it
        const newSelected = board.querySelector(`[data-algebraic="${alg}"]`);
        if (newSelected) {
            selectedSquare = newSelected;
            selectedSquare.style.backgroundColor = 'rgba(79, 158, 11, 0.4)';
            showLegalMoves(alg);
        }
    }
}

function setupClickToMove() {
    const board = document.getElementById('svg-board-compete');

    board.addEventListener('click', (e) => {
        const sq = e.target.closest('.square');
        if (!sq || game.turn() !== 'w' || isAnimating) return;

        const algebraic = sq.dataset.algebraic;
        const piece = game.get(algebraic);

        // Selection
        if (piece && piece.color === 'w') {
            if (selectedSquare === sq) {
                clearHighlights();
                selectedSquare = null;
            } else {
                clearHighlights();
                selectedSquare = sq;
                selectedSquare.style.backgroundColor = 'rgba(79, 158, 11, 0.4)';
                showLegalMoves(algebraic);
            }
        }
        // Move
        else if (selectedSquare) {
            const from = selectedSquare.dataset.algebraic;
            const to = algebraic;

            const move = game.move({ from, to, promotion: 'q' });

            if (move) {
                clearHighlights();
                selectedSquare = null;
                renderGame();
                checkGameOver();
                if (!game.game_over()) {
                    document.getElementById('game-status').textContent = "AI is thinking...";
                    setTimeout(makeAIMove, 800);
                }
            } else {
                clearHighlights();
                selectedSquare = null;
            }
        }
    });
}

function showLegalMoves(square) {
    const moves = game.moves({ square: square, verbose: true });
    const board = document.getElementById('svg-board-compete');

    moves.forEach(move => {
        const targetSq = board.querySelector(`[data-algebraic="${move.to}"]`);
        if (targetSq) {
            if (move.captured) {
                targetSq.classList.add('capture-hint');
            } else {
                const hint = document.createElement('div');
                hint.className = 'hint';
                targetSq.appendChild(hint);
            }
        }
    });
}

function clearHighlights() {
    const board = document.getElementById('svg-board-compete');
    board.querySelectorAll('.square').forEach(sq => {
        sq.style.backgroundColor = '';
        sq.classList.remove('capture-hint');
        const hint = sq.querySelector('.hint');
        if (hint) hint.remove();
    });
}

// --- AI Logic ---
function initStockfish() {
    if (stockfish) return;
    try {
        stockfish = new Worker('stockfish.js');
        stockfish.onmessage = (e) => {
            const line = e.data;
            if (line.indexOf('bestmove') > -1) {
                const moveStr = line.split(' ')[1];
                game.move(moveStr, { slug: true });
                onAIMoveComplete();
            }
        };
        stockfish.postMessage('uci');
    } catch (e) {
        console.error("Stockfish failed to load", e);
    }
}

function makeAIMove() {
    if (game.game_over()) return;

    const level = parseInt(document.getElementById('ai-level').value);

    if (level > 5) {
        if (!stockfish) initStockfish();
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage(`go depth ${level + 2}`);
        return;
    }

    const moves = game.moves({ verbose: true });
    const safeMoves = moves.filter(m => {
        const testGame = new Chess(game.fen());
        testGame.move(m);
        const responses = testGame.moves({ verbose: true });
        const isVulnerable = responses.some(r => r.to === m.to);
        return !isVulnerable || m.captured;
    });

    const candidateMoves = safeMoves.length > 0 ? safeMoves : moves;
    const capturingMoves = candidateMoves.filter(m => m.captured);
    let chosenMove;

    if (capturingMoves.length > 0) {
        const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        capturingMoves.sort((a, b) => values[b.captured] - values[a.captured]);
        chosenMove = capturingMoves[0];
    } else {
        chosenMove = candidateMoves[Math.floor(Math.random() * candidateMoves.length)];
    }

    game.move(chosenMove);
    onAIMoveComplete();
}

function onAIMoveComplete() {
    renderGame();
    checkGameOver();
    if (!game.game_over()) {
        document.getElementById('game-status').textContent = "Your turn (White)";
    }
}

function checkGameOver() {
    if (game.in_checkmate()) {
        document.getElementById('game-status').textContent = "Checkmate! " + (game.turn() === 'w' ? "Black wins!" : "White wins!");
    } else if (game.in_draw()) {
        document.getElementById('game-status').textContent = "Draw!";
    }
}

// Start
init();
