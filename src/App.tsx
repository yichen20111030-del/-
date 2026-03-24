import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Undo2, Lightbulb, CheckCircle2, Wifi, BatteryFull, Signal } from 'lucide-react';
import { Board, createBoard, findMatches, applyGravity, findHint, BOARD_SIZE, PieceType } from './gameLogic';

const PIECE_CONFIG = {
  1: { imgUrl: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/图标/猫1.png', color: 'text-red-600', bg: 'bg-red-100', shape: 'rounded-full', name: '猫1' },
  2: { imgUrl: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/图标/兔1.png', color: 'text-blue-600', bg: 'bg-blue-100', shape: 'rounded-2xl', name: '兔1' },
  3: { imgUrl: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/图标/猫2.png', color: 'text-green-600', bg: 'bg-green-100', shape: 'rounded-full', name: '猫2' },
  4: { imgUrl: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/图标/兔2.png', color: 'text-purple-600', bg: 'bg-purple-100', shape: 'rounded-2xl', name: '兔2' },
  5: { imgUrl: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/图标/兔3.png', color: 'text-amber-600', bg: 'bg-amber-100', shape: 'rounded-full', name: '兔3' },
};

const playSound = (type: 'click' | 'match' | 'win1' | 'win2') => {
  const urls = {
    click: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/声音/click_01.wav',
    match: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/声音/01.WAV',
    win1: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/声音/恭喜获得胜利音效.mp3',
    win2: 'https://raw.githubusercontent.com/yichen20111030-del/PIC/17266cd2829f606594abff8c598ad5cc75fe6660/声音/成功4.mp3'
  };
  const audio = new Audio(urls[type]);
  audio.play().catch(e => console.log('Audio play failed:', e));
};

export default function App() {
  const [board, setBoard] = useState<Board>([]);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState(20);
  const [score, setScore] = useState(0);
  
  // Cognitive Task State
  const [targetType, setTargetType] = useState<PieceType>(1);
  const [targetCount, setTargetCount] = useState(20);
  const [collected, setCollected] = useState(0);

  // Swipe State
  const [dragStart, setDragStart] = useState<{ r: number; c: number; x: number; y: number; id: number } | null>(null);

  // Smart Assist State
  const [hint, setHint] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setBoard(createBoard());
    setSteps(20);
    setScore(0);
    setCollected(0);
    setTargetCount(20);
    setTargetType((Math.floor(Math.random() * 5) + 1) as PieceType);
    setSelected(null);
    setDragStart(null);
    setHint(null);
    setProcessing(false);
    setLastInteraction(Date.now());
  };

  // Smart Assist Timer
  useEffect(() => {
    if (processing) return;
    const timer = setInterval(() => {
      if (Date.now() - lastInteraction > 5000) {
        const newHint = findHint(board);
        if (newHint) setHint(newHint);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [board, lastInteraction, processing]);

  const processMatches = async (currentBoard: Board) => {
    let b = currentBoard;
    let matches = findMatches(b);
    let currentScore = score;
    let currentCollected = collected;
    let hasWon = collected >= targetCount;

    while (matches.length > 0) {
      // 1. Highlight/Remove
      const newB = b.map((row, r) =>
        row.map((p, c) => {
          if (matches.some((m) => m.r === r && m.c === c)) {
            if (p?.type === targetType) currentCollected += 1;
            return null;
          }
          return p;
        })
      );
      
      currentScore += matches.length * 10;
      setScore(currentScore);
      setCollected(currentCollected);
      setBoard([...newB]);
      
      if (!hasWon && currentCollected >= targetCount) {
        hasWon = true;
        playSound(Math.random() > 0.5 ? 'win1' : 'win2');
      }

      // Haptic feedback simulation
      if (navigator.vibrate) navigator.vibrate(50);
      playSound('match');
      
      await new Promise((res) => setTimeout(res, 300));

      // 2. Drop
      b = applyGravity(newB);
      setBoard([...b]);
      await new Promise((res) => setTimeout(res, 400));

      matches = findMatches(b);
    }
    setProcessing(false);
  };

  const handleSwap = async (r1: number, c1: number, r2: number, c2: number) => {
    if (processing || steps <= 0) return;
    setLastInteraction(Date.now());
    setHint(null);
    setProcessing(true);
    setSelected(null);
    setSteps((s) => s - 1);

    const newBoard = board.map((row) => [...row]);
    const temp = newBoard[r1][c1];
    newBoard[r1][c1] = newBoard[r2][c2];
    newBoard[r2][c2] = temp;
    setBoard(newBoard);

    await new Promise((res) => setTimeout(res, 300));

    const matches = findMatches(newBoard);
    if (matches.length === 0) {
      // Swap back
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]); // Error haptic
      const revertBoard = newBoard.map((row) => [...row]);
      const temp2 = revertBoard[r1][c1];
      revertBoard[r1][c1] = revertBoard[r2][c2];
      revertBoard[r2][c2] = temp2;
      setBoard(revertBoard);
      setProcessing(false);
    } else {
      await processMatches(newBoard);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (processing || steps <= 0) return;
    playSound('click');
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    setDragStart({ r, c, x: e.clientX, y: e.clientY, id: e.pointerId });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart || processing || steps <= 0) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > 20 || absDy > 20) {
      let targetR = dragStart.r;
      let targetC = dragStart.c;

      if (absDx > absDy) {
        targetC += dx > 0 ? 1 : -1;
      } else {
        targetR += dy > 0 ? 1 : -1;
      }

      if (targetR >= 0 && targetR < BOARD_SIZE && targetC >= 0 && targetC < BOARD_SIZE) {
        handleSwap(dragStart.r, dragStart.c, targetR, targetC);
      }
      try {
        e.currentTarget.releasePointerCapture(dragStart.id);
      } catch (err) {}
      setDragStart(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart) {
      try {
        e.currentTarget.releasePointerCapture(dragStart.id);
      } catch (err) {}
      setDragStart(null);
    }
  };

  const handleHint = () => {
    setLastInteraction(Date.now());
    const newHint = findHint(board);
    if (newHint) setHint(newHint);
  };

  if (board.length === 0) return null;

  const targetImgUrl = PIECE_CONFIG[targetType].imgUrl;

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center sm:p-8 font-sans selection:bg-transparent">
      {/* Phone Frame */}
      <div className="relative w-full h-[100dvh] sm:h-[844px] sm:w-[390px] bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 sm:rounded-[3rem] sm:border-[14px] border-gray-900 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Simulated Status Bar */}
        <div className="h-12 w-full px-6 flex justify-between items-center text-gray-800 text-sm font-medium z-20 shrink-0">
          <span>9:41</span>
          {/* Simulated Notch */}
          <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl"></div>
          <div className="flex items-center gap-1.5">
            <Signal size={14} />
            <Wifi size={14} />
            <BatteryFull size={16} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-4 pb-12 flex flex-col justify-center overflow-y-auto no-scrollbar">
          <div className="w-full space-y-6">
            
            {/* Title */}
            <div className="flex items-center justify-center gap-3 py-2">
              <img 
                src="https://raw.githubusercontent.com/yichen20111030-del/PIC/d9c6cff7973d1124ed8cecf2ee5f64b63bad118a/%E6%A0%87%E5%BF%97-%E5%B0%81%E9%9D%A2%20%E6%8B%B7%E8%B4%9D.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain drop-shadow-md"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 tracking-wider drop-shadow-sm">
                玲妈的专属消消乐
              </h1>
            </div>
            
            {/* Header / Cognitive Task Area */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg rounded-3xl p-6 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-gray-500 text-base font-medium mb-1">剩余步数</span>
            <span className="text-3xl font-bold text-gray-800">{steps}</span>
          </div>
          
          <div className="flex flex-col items-center bg-white/50 rounded-2xl p-3 px-6 shadow-sm border border-white/80">
            <span className="text-gray-600 text-xs font-bold mb-2">收集目标</span>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 flex items-center justify-center ${PIECE_CONFIG[targetType].bg} ${PIECE_CONFIG[targetType].color} ${PIECE_CONFIG[targetType].shape}`}>
                <img src={targetImgUrl} alt="Target" className="w-[90%] h-[90%] object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="text-xl font-bold text-gray-800">
                {collected} <span className="text-gray-400 text-base">/ {targetCount}</span>
              </span>
            </div>
            {collected >= targetCount && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 text-green-500 bg-white rounded-full shadow-md">
                <CheckCircle2 size={28} className="fill-green-100" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Game Board (Glassmorphism) */}
        <div className="bg-white/30 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2.5rem] p-4 relative overflow-hidden touch-none">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isSelected = dragStart?.r === r && dragStart?.c === c;
                const isHinted = hint && ((hint.r1 === r && hint.c1 === c) || (hint.r2 === r && hint.c2 === c));
                
                return (
                  <div
                    key={`${r}-${c}`}
                    className="aspect-square relative flex items-center justify-center touch-none cursor-pointer"
                    onPointerDown={(e) => handlePointerDown(e, r, c)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    {/* Background slot for empty spaces */}
                    <div className="absolute inset-0 bg-black/5 rounded-xl sm:rounded-2xl" />
                    
                    <AnimatePresence>
                      {piece && (
                        <motion.div
                          layout
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            scale: isSelected ? 1.15 : 1,
                            opacity: 1,
                            rotate: isSelected ? [0, -5, 5, -5, 0] : 0
                          }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            type: 'spring', 
                            stiffness: 300, 
                            damping: 25,
                            rotate: { repeat: isSelected ? Infinity : 0, duration: 0.5 }
                          }}
                          className={`absolute inset-0 flex items-center justify-center shadow-sm pointer-events-none
                            ${PIECE_CONFIG[piece.type].bg} 
                            ${PIECE_CONFIG[piece.type].color} 
                            ${PIECE_CONFIG[piece.type].shape}
                            ${isHinted ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-white/30' : ''}
                            ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-white/30 z-10 shadow-lg' : ''}
                          `}
                        >
                          <img 
                            src={PIECE_CONFIG[piece.type].imgUrl} 
                            alt={PIECE_CONFIG[piece.type].name}
                            className="w-[90%] h-[90%] object-contain pointer-events-none"
                            referrerPolicy="no-referrer"
                            draggable={false}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Controls (Elderly Friendly) */}
        <div className="flex justify-between gap-4">
          <button
            onClick={startNewGame}
            className="flex-1 bg-white/60 hover:bg-white/80 backdrop-blur-md border border-white/60 shadow-md rounded-full py-4 flex flex-col items-center justify-center transition-all active:scale-95"
            aria-label="重新开始"
          >
            <RotateCcw size={28} className="text-gray-700 mb-1" />
            <span className="text-gray-800 font-bold text-base">重来</span>
          </button>
          
          <button
            onClick={handleHint}
            disabled={processing}
            className="flex-1 bg-white/60 hover:bg-white/80 backdrop-blur-md border border-white/60 shadow-md rounded-full py-4 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            aria-label="获取提示"
          >
            <Lightbulb size={28} className="text-yellow-600 mb-1" />
            <span className="text-gray-800 font-bold text-base">提示</span>
          </button>
        </div>

          </div>
        </div>

        {/* Win Character Animation */}
        <AnimatePresence>
          {collected >= targetCount && (
            <motion.div
              initial={{ y: 200, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 200, opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
              className="absolute bottom-24 right-4 z-50 pointer-events-none flex flex-col items-center"
            >
              <motion.div 
                animate={{ y: [0, -8, 0] }} 
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl mb-2 border-2 border-pink-200 relative"
              >
                <span className="text-pink-600 font-bold text-lg">太棒啦！过关！</span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-pink-200 rotate-45"></div>
              </motion.div>
              <img 
                src="https://raw.githubusercontent.com/yichen20111030-del/PIC/d9c6cff7973d1124ed8cecf2ee5f64b63bad118a/nanzi.png" 
                alt="Success Character" 
                className="w-32 h-32 object-contain drop-shadow-2xl origin-bottom"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulated Home Indicator */}
        <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-gray-800/50 rounded-full z-20"></div>
      </div>
    </div>
  );
}
