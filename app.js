/* Chess: vs Player or vs Computer with difficulty levels */

const ROWS = 8, COLS = 8, SIZE = 64;
const PIECES = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

const els = {
  board: document.getElementById('board'),
  turnPill: document.getElementById('turnPill'),
  statusPill: document.getElementById('statusPill'),
  difficultyBar: document.getElementById('difficultyBar'),
  newGameBtn: document.getElementById('newGameBtn'),
};

let board = [];        // 64: null or single char 'K','Q',...,'p' (uppercase=white, lowercase=black)
let turn = 'w';       // 'w' or 'b'
let selected = -1;    // index of selected square, or -1
let lastFrom = -1, lastTo = -1;
let mode = 'player';  // 'player' | 'computer'
let difficulty = 'medium'; // easy, medium, advanced, master, grandmaster
let gameOver = false;
let squareEls = [];

function idx(r, c) { return r * 8 + c; }
function row(i) { return Math.floor(i / 8); }
function col(i) { return i % 8; }
function isWhite(p) { return p && p === p.toUpperCase(); }
function pieceColor(p) { return isWhite(p) ? 'w' : 'b'; }
function isLight(i) { const r = row(i), c = col(i); return (r + c) % 2 === 0; }

function initialBoard() {
  const b = Array(SIZE).fill(null);
  const back = (color, r) => {
    const base = color === 'w' ? 'RNBQKBNR' : 'rnbqkbnr';
    for (let c = 0; c < 8; c++) b[idx(r, c)] = base[c];
  };
  back('b', 0);
  for (let c = 0; c < 8; c++) b[idx(1, c)] = 'p';
  for (let c = 0; c < 8; c++) b[idx(6, c)] = 'P';
  back('w', 7);
  return b;
}

function copyBoard(b) { return b.slice(); }

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getKingIndex(b, color) {
  const king = color === 'w' ? 'K' : 'k';
  for (let i = 0; i < SIZE; i++) if (b[i] === king) return i;
  return -1;
}

function isAttacked(b, squareIdx, byColor) {
  for (let from = 0; from < SIZE; from++) {
    if (!b[from] || pieceColor(b[from]) !== byColor) continue;
    const moves = pseudoLegalMovesFrom(b, from, byColor);
    if (moves.includes(squareIdx)) return true;
  }
  return false;
}

function pseudoLegalMovesFrom(b, fromIdx, forColor) {
  const p = b[fromIdx];
  if (!p || pieceColor(p) !== forColor) return [];
  const r = row(fromIdx), ccol = col(fromIdx);
  const out = [];

  const add = (toIdx) => {
    const toPiece = b[toIdx];
    if (!toPiece || pieceColor(toPiece) !== forColor) out.push(toIdx);
  };

  const slide = (dr, dc) => {
    let nr = r + dr, nc = ccol + dc;
    while (inBounds(nr, nc)) {
      const toIdx = idx(nr, nc);
      const toPiece = b[toIdx];
      if (!toPiece) { out.push(toIdx); nr += dr; nc += dc; continue; }
      if (pieceColor(toPiece) !== forColor) out.push(toIdx);
      break;
    }
  };

  const pLower = p.toLowerCase();
  if (pLower === 'p') {
    const dir = forColor === 'w' ? -1 : 1;
    const startRow = forColor === 'w' ? 6 : 1;
    const one = idx(r + dir, ccol);
    if (inBounds(r + dir, ccol) && !b[one]) {
      out.push(one);
      const two = idx(r + 2 * dir, ccol);
      if (r === startRow && !b[two]) out.push(two);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = ccol + dc;
      if (inBounds(nr, nc)) {
        const toIdx = idx(nr, nc);
        if (b[toIdx] && pieceColor(b[toIdx]) !== forColor) out.push(toIdx);
      }
    }
  } else if (pLower === 'n') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
      if (inBounds(r + dr, ccol + dc)) add(idx(r + dr, ccol + dc));
  } else if (pLower === 'k') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if ((dr || dc) && inBounds(r + dr, ccol + dc)) add(idx(r + dr, ccol + dc));
  } else if (pLower === 'r') {
    slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
  } else if (pLower === 'b') {
    slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
  } else if (pLower === 'q') {
    slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
    slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
  }

  return out;
}

function isInCheck(b, color) {
  const ki = getKingIndex(b, color);
  return ki >= 0 && isAttacked(b, ki, color === 'w' ? 'b' : 'w');
}

function pseudoLegalMoves(b, fromIdx) {
  const p = b[fromIdx];
  if (!p) return [];
  return pseudoLegalMovesFrom(b, fromIdx, pieceColor(p));
}

function legalMovesFromBoard(b, fromIdx) {
  const moves = pseudoLegalMovesFrom(b, fromIdx, pieceColor(b[fromIdx]));
  const result = [];
  const p = b[fromIdx];
  const c = pieceColor(p);
  for (const toIdx of moves) {
    const next = copyBoard(b);
    next[toIdx] = next[fromIdx];
    next[fromIdx] = null;
    if (!isInCheck(next, c)) result.push(toIdx);
  }
  return result;
}

function legalMoves(fromIdx) {
  return legalMovesFromBoard(board, fromIdx);
}

function allLegalMovesOnBoard(b, color) {
  const moves = [];
  for (let i = 0; i < SIZE; i++) {
    if (!b[i] || pieceColor(b[i]) !== color) continue;
    for (const to of legalMovesFromBoard(b, i)) moves.push({ from: i, to });
  }
  return moves;
}

function allLegalMoves(color) {
  return allLegalMovesOnBoard(board, color);
}

function applyMoveOnBoard(b, fromIdx, toIdx) {
  const next = copyBoard(b);
  next[toIdx] = next[fromIdx];
  next[fromIdx] = null;
  const p = next[toIdx];
  if (p && (p.toLowerCase() === 'p') && (row(toIdx) === 0 || row(toIdx) === 7))
    next[toIdx] = (pieceColor(p) === 'w' ? 'Q' : 'q');
  return next;
}

function applyMove(fromIdx, toIdx) {
  return applyMoveOnBoard(board, fromIdx, toIdx);
}

function makeMove(fromIdx, toIdx) {
  board = applyMove(fromIdx, toIdx);
  lastFrom = fromIdx; lastTo = toIdx;
  turn = turn === 'w' ? 'b' : 'w';
  selected = -1;
}

function endGameMessage() {
  const moves = allLegalMoves(turn);
  const inCheck = isInCheck(board, turn);
  if (moves.length === 0) {
    if (inCheck) return turn === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins';
    return 'Stalemate — Draw';
  }
  if (inCheck) return turn === 'w' ? 'White in check' : 'Black in check';
  return null;
}

function updateUI() {
  const msg = endGameMessage();
  if (msg) {
    gameOver = true;
    els.statusPill.textContent = msg;
    els.turnPill.textContent = 'Game over';
  } else {
    els.statusPill.textContent = '';
    els.turnPill.textContent = gameOver ? 'Game over' : (turn === 'w' ? 'White to move' : 'Black to move');
  }

  const validSet = selected >= 0 ? new Set(legalMoves(selected)) : new Set();
  for (let i = 0; i < SIZE; i++) {
    const el = squareEls[i];
    const p = board[i];
    el.textContent = p ? PIECES[p] || p : '';
    el.className = 'sq ' + (isLight(i) ? 'light' : 'dark');
    if (gameOver) el.classList.add('disabled');
    else el.classList.remove('disabled');
    if (i === selected) el.classList.add('selected');
    else el.classList.remove('selected');
    if (validSet.has(i)) el.classList.add('valid');
    else el.classList.remove('valid');
    if (i === lastFrom || i === lastTo) el.classList.add(i === lastFrom ? 'lastFrom' : 'lastTo');
    else { el.classList.remove('lastFrom'); el.classList.remove('lastTo'); }
  }
}

function buildBoard() {
  els.board.innerHTML = '';
  squareEls = [];
  for (let i = 0; i < SIZE; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sq ' + (isLight(i) ? 'light' : 'dark');
    btn.dataset.idx = String(i);
    btn.setAttribute('aria-label', `Square ${String.fromCharCode(97 + col(i))}${8 - row(i)}`);
    btn.addEventListener('click', () => onSquareClick(i));
    squareEls.push(btn);
    els.board.appendChild(btn);
  }
}

function onSquareClick(i) {
  if (gameOver) return;
  const isComputerTurn = mode === 'computer' && turn === 'b';
  if (isComputerTurn) return;

  if (selected >= 0) {
    const valid = legalMoves(selected);
    if (valid.includes(i)) {
      makeMove(selected, i);
      updateUI();
      if (mode === 'computer' && turn === 'b' && !gameOver) setTimeout(computerMove, 320);
      return;
    }
  }

  const p = board[i];
  if (p && pieceColor(p) === turn) selected = i;
  else selected = -1;
  updateUI();
}

function simpleEval(b) {
  const val = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0, p: -1, n: -3, b: -3, r: -5, q: -9, k: 0 };
  let score = 0;
  for (let i = 0; i < SIZE; i++) if (b[i]) score += val[b[i]];
  return score;
}

function getDepth() {
  switch (difficulty) {
    case 'easy': return 0;
    case 'medium': return 1;
    case 'advanced': return 2;
    case 'master': return 3;
    case 'grandmaster': return 4;
    default: return 1;
  }
}

function minimax(b, depth, isBlackTurn, alpha = -1e9, beta = 1e9) {
  const moves = allLegalMovesOnBoard(b, isBlackTurn ? 'b' : 'w');
  if (moves.length === 0) {
    if (isBlackTurn) return isInCheck(b, 'b') ? -1e6 : 0;
    return isInCheck(b, 'w') ? 1e6 : 0;
  }
  if (depth === 0) return simpleEval(b);

  if (isBlackTurn) {
    let best = 1e9;
    for (const { from, to } of moves) {
      const next = applyMoveOnBoard(b, from, to);
      const score = minimax(next, depth - 1, false, alpha, beta);
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = -1e9;
    for (const { from, to } of moves) {
      const next = applyMoveOnBoard(b, from, to);
      const score = minimax(next, depth - 1, true, alpha, beta);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function computerMove() {
  if (gameOver || turn !== 'b') return;
  const moves = allLegalMoves('b');
  if (moves.length === 0) { updateUI(); return; }

  const depth = getDepth();
  let bestMove = moves[0];
  let bestScore = 1e9;

  if (depth === 0) {
    bestMove = moves[Math.floor(Math.random() * moves.length)];
  } else {
    for (const move of moves) {
      const next = applyMoveOnBoard(board, move.from, move.to);
      const score = minimax(next, depth - 1, false);
      if (score < bestScore) { bestScore = score; bestMove = move; }
    }
  }

  makeMove(bestMove.from, bestMove.to);
  updateUI();
}

function newGame() {
  board = initialBoard();
  turn = 'w';
  selected = -1;
  lastFrom = lastTo = -1;
  gameOver = false;
  updateUI();
}

function setMode(m) {
  mode = m;
  els.difficultyBar.classList.toggle('hidden', mode !== 'computer');
  if (mode === 'player') els.difficultyBar.setAttribute('aria-hidden', 'true');
  else els.difficultyBar.setAttribute('aria-hidden', 'false');
  updateUI();
}

function setDifficulty(d) {
  difficulty = d;
  document.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.classList.toggle('isActive', btn.getAttribute('data-difficulty') === difficulty);
  });
}

function init() {
  buildBoard();
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.getAttribute('data-mode');
      setMode(m);
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('isActive', b.getAttribute('data-mode') === m));
    });
  });
  document.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.getAttribute('data-difficulty')));
  });
  els.newGameBtn.addEventListener('click', newGame);
  setMode(mode);
  setDifficulty(difficulty);
  newGame();
}

init();
