export type PieceType = 1 | 2 | 3 | 4 | 5;

export interface Piece {
  id: string;
  type: PieceType;
}

export type Board = (Piece | null)[][];

export const BOARD_SIZE = 7;

export function createBoard(): Board {
  const board: Board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      let type: PieceType;
      do {
        type = (Math.floor(Math.random() * 5) + 1) as PieceType;
      } while (
        (r >= 2 && board[r - 1][c]?.type === type && board[r - 2][c]?.type === type) ||
        (c >= 2 && board[r][c - 1]?.type === type && board[r][c - 2]?.type === type)
      );
      board[r][c] = { id: Math.random().toString(36).substring(2, 9), type };
    }
  }
  return board;
}

export function findMatches(board: Board): { r: number; c: number }[] {
  const matches = new Set<string>();

  // Horizontal matches
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 2; c++) {
      const p1 = board[r][c];
      const p2 = board[r][c + 1];
      const p3 = board[r][c + 2];
      if (p1 && p2 && p3 && p1.type === p2.type && p2.type === p3.type) {
        matches.add(`${r},${c}`);
        matches.add(`${r},${c + 1}`);
        matches.add(`${r},${c + 2}`);
      }
    }
  }

  // Vertical matches
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 2; r++) {
      const p1 = board[r][c];
      const p2 = board[r + 1][c];
      const p3 = board[r + 2][c];
      if (p1 && p2 && p3 && p1.type === p2.type && p2.type === p3.type) {
        matches.add(`${r},${c}`);
        matches.add(`${r + 1},${c}`);
        matches.add(`${r + 2},${c}`);
      }
    }
  }

  return Array.from(matches).map((str) => {
    const [r, c] = str.split(',').map(Number);
    return { r, c };
  });
}

export function applyGravity(board: Board): Board {
  const newBoard = board.map((row) => [...row]);

  for (let c = 0; c < BOARD_SIZE; c++) {
    let emptyRow = BOARD_SIZE - 1;
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (newBoard[r][c] !== null) {
        if (emptyRow !== r) {
          newBoard[emptyRow][c] = newBoard[r][c];
          newBoard[r][c] = null;
        }
        emptyRow--;
      }
    }
    // Fill the top with new pieces
    for (let r = emptyRow; r >= 0; r--) {
      newBoard[r][c] = {
        id: Math.random().toString(36).substring(2, 9),
        type: (Math.floor(Math.random() * 5) + 1) as PieceType,
      };
    }
  }
  return newBoard;
}

export function findHint(board: Board): { r1: number; c1: number; r2: number; c2: number } | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // Try swap right
      if (c < BOARD_SIZE - 1) {
        const b = board.map((row) => [...row]);
        const temp = b[r][c];
        b[r][c] = b[r][c + 1];
        b[r][c + 1] = temp;
        if (findMatches(b).length > 0) return { r1: r, c1: c, r2: r, c2: c + 1 };
      }
      // Try swap down
      if (r < BOARD_SIZE - 1) {
        const b = board.map((row) => [...row]);
        const temp = b[r][c];
        b[r][c] = b[r + 1][c];
        b[r + 1][c] = temp;
        if (findMatches(b).length > 0) return { r1: r, c1: c, r2: r, c2: r + 1 };
      }
    }
  }
  return null;
}
