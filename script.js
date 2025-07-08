const PIECES = {
  r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
  R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚', P: '♟'
};

function createPiece(type, color) {
  return { type, color, hasMoved: false };
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

const INITIAL_BOARD = [
  [createPiece('r','black'), createPiece('n','black'), createPiece('b','black'), createPiece('q','black'), createPiece('k','black'), createPiece('b','black'), createPiece('n','black'), createPiece('r','black')],
  [createPiece('p','black'), createPiece('p','black'), createPiece('p','black'), createPiece('p','black'), createPiece('p','black'), createPiece('p','black'), createPiece('p','black'), createPiece('p','black')],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [createPiece('p','white'), createPiece('p','white'), createPiece('p','white'), createPiece('p','white'), createPiece('p','white'), createPiece('p','white'), createPiece('p','white'), createPiece('p','white')],
  [createPiece('r','white'), createPiece('n','white'), createPiece('b','white'), createPiece('q','white'), createPiece('k','white'), createPiece('b','white'), createPiece('n','white'), createPiece('r','white')]
];

let board = cloneBoard(INITIAL_BOARD);
let selectedSquare = null;
let validMoves = [];
let currentPlayer = 'white';
let whitePoints = 0;
let blackPoints = 0;

const boardContainer = document.getElementById('chessboard');
const turnIndicator = document.getElementById('turnIndicator');
const resetBtn = document.getElementById('resetBtn');

resetBtn.onclick = () => {
  board = cloneBoard(INITIAL_BOARD);
  currentPlayer = 'white';
  whitePoints = 0;
  blackPoints = 0;
  document.getElementById('whitePoints').textContent = 'White ♙: 0';
  document.getElementById('blackPoints').textContent = 'Black ♟: 0';
  updateBoard();
  turnIndicator.textContent = 'Current turn: White ♙';
  turnIndicator.style.background = '#ffffff';
  turnIndicator.style.color = '#333333';
};

for (let row=0; row<8; row++) {
  for (let col=0; col<8; col++) {
    const square = document.createElement('div');
    square.classList.add('square');
    square.classList.add((row+col)%2 === 0 ? 'light' : 'dark');
    square.dataset.row = row;
    square.dataset.col = col;
    square.addEventListener('click', handleSquareClick);
    boardContainer.appendChild(square);
  }
}
updateBoard();

function handleSquareClick() {
  const row = parseInt(this.dataset.row);
  const col = parseInt(this.dataset.col);
  const piece = board[row][col];

  if (piece && piece.color === currentPlayer) {
    deselectAll();
    this.classList.add('selected');
    selectedSquare = { row, col };
    validMoves = getValidMoves(piece, row, col, board, true);
    highlightValidMoves();
    return;
  }

  if (!selectedSquare) return;

  if (validMoves.some(m => m.row === row && m.col === col)) {
    const movingPiece = board[selectedSquare.row][selectedSquare.col];
    const target = board[row][col];
    if (target && target.color !== currentPlayer) {
      const pieceValue = { p:1, n:3, b:3, r:5, q:9, k:0 };
      const value = pieceValue[target.type];
      if (currentPlayer === 'white') whitePoints += value;
      else blackPoints += value;
      document.getElementById('whitePoints').textContent = `White ♙: ${whitePoints}`;
      document.getElementById('blackPoints').textContent = `Black ♟: ${blackPoints}`;
    }
    movingPiece.hasMoved = true;

    board[row][col] = movingPiece;
    board[selectedSquare.row][selectedSquare.col] = null;

    // Handle castling
    if (movingPiece.type === 'k' && Math.abs(col - selectedSquare.col) === 2) {
      if (col === 6) { // kingside
        const rook = board[row][7];
        board[row][5] = rook;
        board[row][7] = null;
        rook.hasMoved = true;
      } else if (col === 2) { // queenside
        const rook = board[row][0];
        board[row][3] = rook;
        board[row][0] = null;
        rook.hasMoved = true;
      }
    }

    handlePromotion(row, col, movingPiece);

    const opponent = currentPlayer === 'white' ? 'black' : 'white';
    currentPlayer = opponent;
    updateBoard();
    deselectAll();

    if (isKingInCheck(opponent, board)) {
      if (!hasAnyLegalMove(opponent)) {
        alert(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`);
      } else {
        alert(`${currentPlayer === 'white' ? 'White' : 'Black'} is in check!`);
      }
    } else if (!hasAnyLegalMove(opponent)) {
      alert('Stalemate!');
    }

    turnIndicator.textContent = `Current turn: ${currentPlayer === 'white' ? 'White ♙' : 'Black ♟'}`;
    turnIndicator.style.background = currentPlayer === 'white' ? '#ffffff' : '#333333';
    turnIndicator.style.color = currentPlayer === 'white' ? '#333333' : '#ffffff';
  }

  deselectAll();
}

function deselectAll() {
  document.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('selected');
    sq.classList.remove('valid-move');
  });
  selectedSquare = null;
  validMoves = [];
}

function updateBoard() {
  document.querySelectorAll('.square').forEach(sq => {
    const r = parseInt(sq.dataset.row);
    const c = parseInt(sq.dataset.col);
    const piece = board[r][c];
    if (piece) {
      const symbol = PIECES[piece.color === 'white' ? piece.type.toUpperCase() : piece.type];
      sq.innerHTML = `<span class="piece-${piece.color}">${symbol}</span>`;
    } else {
      sq.innerHTML = '';
    }
  });
}

function highlightValidMoves() {
  validMoves.forEach(move => {
    const idx = move.row * 8 + move.col;
    document.querySelectorAll('.square')[idx].classList.add('valid-move');
  });
}

function getValidMoves(piece, row, col, boardState, validateKing) {
  const moves = [];
  const dir = piece.color === 'white' ? -1 : 1;

  const addIfSafe = (r, c) => {
    if (isInBounds(r,c) && (!boardState[r][c] || boardState[r][c].color !== piece.color)) {
      if (!validateKing || isMoveSafe(row, col, r, c)) {
        moves.push({ row: r, col: c });
      }
    }
  };

  switch(piece.type) {
    case 'p':
      if (isInBounds(row + dir, col) && !boardState[row + dir][col]) {
        if (!validateKing || isMoveSafe(row, col, row + dir, col))
          moves.push({ row: row + dir, col });
        if (!piece.hasMoved && !boardState[row + 2*dir][col]) {
          if (!validateKing || isMoveSafe(row, col, row + 2*dir, col))
            moves.push({ row: row + 2*dir, col });
        }
      }
      [-1,1].forEach(d => {
        const r2 = row + dir, c2 = col + d;
        if (isInBounds(r2, c2) && boardState[r2][c2] && boardState[r2][c2].color !== piece.color) {
          if (!validateKing || isMoveSafe(row, col, r2, c2))
            moves.push({ row: r2, col: c2 });
        }
      });
      break;
    case 'r':
      return getLinearMoves(row, col, [[1,0],[-1,0],[0,1],[0,-1]], piece.color, validateKing);
    case 'b':
      return getLinearMoves(row, col, [[1,1],[1,-1],[-1,1],[-1,-1]], piece.color, validateKing);
    case 'q':
      return getLinearMoves(row, col, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], piece.color, validateKing);
    case 'n':
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dx,dy])=>{
        addIfSafe(row+dx, col+dy);
      });
      break;
    case 'k':
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dx,dy])=>{
        addIfSafe(row+dx, col+dy);
      });
      // Castling
      if (!piece.hasMoved && validateKing) {
        if (canCastle(row, col, 'kingside')) moves.push({ row, col:6 });
        if (canCastle(row, col, 'queenside')) moves.push({ row, col:2 });
      }
      break;
  }
  return moves;
}

function getLinearMoves(row, col, directions, color, validateKing) {
  const moves = [];
  directions.forEach(([dx,dy])=>{
    let r = row+dx, c = col+dy;
    while (isInBounds(r,c)) {
      if (!board[r][c]) {
        if (!validateKing || isMoveSafe(row, col, r, c))
          moves.push({ row:r, col:c });
      } else {
        if (board[r][c].color !== color) {
          if (!validateKing || isMoveSafe(row, col, r, c))
            moves.push({ row:r, col:c });
        }
        break;
      }
      r+=dx; c+=dy;
    }
  });
  return moves;
}

function isInBounds(r,c) {
  return r>=0 && r<8 && c>=0 && c<8;
}

function handlePromotion(row, col, piece) {
  if (piece.type==='p' && ((piece.color==='white' && row===0)||(piece.color==='black' && row===7))) {
    piece.type='q';
  }
}

function isMoveSafe(fromR, fromC, toR, toC) {
  const temp = cloneBoard(board);
  temp[toR][toC] = temp[fromR][fromC];
  temp[fromR][fromC] = null;
  return !isKingInCheck(currentPlayer, temp);
}

function isKingInCheck(color, tempBoard) {
  let kingPos=null;
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      const p = tempBoard[r][c];
      if (p && p.type==='k' && p.color===color){
        kingPos={r,c};
        break;
      }
    }
    if(kingPos) break;
  }
  const opponent = color==='white'?'black':'white';
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      const p = tempBoard[r][c];
      if (p && p.color===opponent){
        const moves = getValidMoves(p, r, c, tempBoard, false);
        if (moves.some(m=>m.row===kingPos.r && m.col===kingPos.c)){
          return true;
        }
      }
    }
  }
  return false;
}

function canCastle(row, col, side) {
  if (isKingInCheck(currentPlayer, board)) return false;
  const rookCol = side==='kingside'?7:0;
  const rook = board[row][rookCol];
  if (!rook || rook.hasMoved || rook.type!=='r') return false;
  const dir = side==='kingside'?1:-1;
  for (let i=1;i<=(side==='kingside'?2:3);i++){
    const c = col+i*dir;
    if (board[row][c]) return false;
    if (i<=2){
      if (!isMoveSafe(row,col,row,c)) return false;
    }
  }
  return true;
}

function hasAnyLegalMove(color) {
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      const p = board[r][c];
      if (p && p.color===color){
        const moves = getValidMoves(p,r,c,board,true);
        if (moves.length) return true;
      }
    }
  }
  return false;
}
