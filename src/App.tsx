import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Undo2, Lightbulb, CheckCircle2, Wifi, BatteryFull, Signal, Maximize, Minimize } from 'lucide-react';
import { Board, createBoard, findMatches, applyGravity, findHint, ROWS, COLS, PieceType } from './gameLogic';

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
  const [level, setLevel] = useState(1);
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
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Smart Assist State
  const [hint, setHint] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const getDifficultyParams = (lvl: number) => {
    let numTypes = 5;
    let target = 20;
    let initialSteps = 30;

    if (lvl <= 10) {
      numTypes = 4;
      target = 10 + lvl * 2;
      initialSteps = 30;
    } else if (lvl <= 30) {
      numTypes = 5;
      target = 20 + (lvl - 10) * 2;
      initialSteps = 35;
    } else {
      numTypes = 5;
      target = 40 + (lvl - 30) * 2;
      initialSteps = 40;
    }
    return { numTypes, target, initialSteps };
  };

  useEffect(() => {
    startNewGame(1);
  }, []);

  const startNewGame = (newLevel?: number) => {
    const currentLevel = newLevel ?? level;
    if (newLevel !== undefined) setLevel(newLevel);
    
    const { numTypes, target, initialSteps } = getDifficultyParams(currentLevel);
    
    setBoard(createBoard(numTypes));
    setSteps(initialSteps);
    setScore(0);
    setCollected(0);
    setTargetCount(target);
    setTargetType((Math.floor(Math.random() * numTypes) + 1) as PieceType);
    setSelected(null);
    setDragStart(null);
    setHint(null);
    setProcessing(false);
    setLastInteraction(Date.now());
  };

  const handleNextLevel = () => {
    startNewGame(level + 1);
  };

  // Auto advance to next level
  useEffect(() => {
    if (collected >= targetCount && targetCount > 0) {
      const timer = setTimeout(() => {
        handleNextLevel();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [collected, targetCount, level]);

  // Smart Assist Timer
  useEffect(() => {
    if (processing) return;
    const timer = setInterval(() => {
      if (Date.now() - lastInteraction > 5000) {
        const newHint = findHint(board, targetType);
        if (newHint) setHint(newHint);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [board, lastInteraction, processing, targetType]);

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
      const { numTypes } = getDifficultyParams(level);
      b = applyGravity(newB, numTypes);
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
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart || processing || steps <= 0) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // Update visual offset for liquid effect
    setDragOffset({ x: dx, y: dy });

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Increase threshold to allow visual dragging before swap
    if (absDx > 40 || absDy > 40) {
      let targetR = dragStart.r;
      let targetC = dragStart.c;

      if (absDx > absDy) {
        targetC += dx > 0 ? 1 : -1;
      } else {
        targetR += dy > 0 ? 1 : -1;
      }

      if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
        handleSwap(dragStart.r, dragStart.c, targetR, targetC);
      }
      try {
        e.currentTarget.releasePointerCapture(dragStart.id);
      } catch (err) {}
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart) {
      try {
        e.currentTarget.releasePointerCapture(dragStart.id);
      } catch (err) {}
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleHint = () => {
    setLastInteraction(Date.now());
    const newHint = findHint(board, targetType);
    if (newHint) setHint(newHint);
  };

  if (board.length === 0) return null;

  const targetImgUrl = PIECE_CONFIG[targetType].imgUrl;

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center sm:p-8 font-sans selection:bg-transparent">
      {/* Phone Frame / Fullscreen Container */}
      <div className={`relative w-full h-[100dvh] bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'sm:h-[100dvh] sm:w-full sm:rounded-none sm:border-0' 
          : 'sm:h-[844px] sm:w-[390px] sm:rounded-[3rem] sm:border-[14px] border-gray-900 shadow-2xl'
      }`}>
        
        {/* Simulated Status Bar */}
        <div className="h-12 w-full px-6 flex justify-between items-center text-gray-800 text-sm font-medium z-20 shrink-0">
          <span>9:41</span>
          {/* Simulated Notch */}
          {!isFullscreen && <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl"></div>}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFullScreen} 
              className="hover:bg-black/10 p-1 rounded-full transition-colors" 
              aria-label="全屏切换"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <div className="flex items-center gap-1.5">
              <Signal size={14} />
              <Wifi size={14} />
              <BatteryFull size={16} />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-4 pb-12 flex flex-col justify-center overflow-y-auto no-scrollbar">
          <div className="w-full space-y-6">
            
            {/* Title */}
            <div className="flex flex-col items-center justify-center gap-3 py-2 w-full">
              <div className="flex items-center justify-center gap-3 w-full px-4">
                <img 
                  src="https://raw.githubusercontent.com/yichen20111030-del/PIC/d9c6cff7973d1124ed8cecf2ee5f64b63bad118a/%E6%A0%87%E5%BF%97-%E5%B0%81%E9%9D%A2%20%E6%8B%B7%E8%B4%9D.png" 
                  alt="Logo" 
                  className="w-8 h-8 object-contain drop-shadow-md"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#9b27df] to-[#f43f9a] tracking-wider drop-shadow-sm">
                  玲妈的专属消消乐
                </h1>
              </div>
              <div className="bg-gradient-to-r from-[#9c2a7a] to-[#7a1b5c] text-white px-8 py-1.5 rounded-full text-sm font-bold shadow-md border border-white/20">
                第 {level} 关
              </div>
            </div>
            
            {/* Header / Cognitive Task Area */}
            <div className="bg-white/40 backdrop-blur-2xl border-t-2 border-l-2 border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-[2rem] p-4 flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
              
              <div className="flex flex-col relative z-10 pl-2">
                <span className="text-gray-700 text-xs font-bold mb-1">剩余步数</span>
                <span className="text-5xl font-black text-[#1a2b4c] tracking-tighter leading-none">{steps}</span>
              </div>
              
              <div className="flex flex-col items-center bg-white/50 backdrop-blur-md rounded-2xl p-2 px-4 shadow-inner border border-white/60 relative z-10">
                <span className="text-gray-800 text-[10px] font-bold mb-1">收集目标</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-sm border-2 border-orange-300">
                    <img 
                      src={targetImgUrl} 
                      alt="Target" 
                      className="w-3/4 h-3/4 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-gray-900">{collected}</span>
                    <span className="text-gray-500 font-bold text-sm">/ {targetCount}</span>
                  </div>
                </div>
              </div>
            </div>

        {/* Game Board (Glassmorphism) */}
        <div className="bg-white/30 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2.5rem] p-4 relative overflow-hidden touch-none">
          <div 
            className="grid gap-1 sm:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isSelected = dragStart?.r === r && dragStart?.c === c;
                const isHinted = hint && ((hint.r1 === r && hint.c1 === c) || (hint.r2 === r && hint.c2 === c));
                
                // Liquid stretch effect calculations
                const x = isSelected ? dragOffset.x : 0;
                const y = isSelected ? dragOffset.y : 0;
                const stretchX = isSelected ? 1 + Math.abs(dragOffset.x) / 150 : 1;
                const stretchY = isSelected ? 1 + Math.abs(dragOffset.y) / 150 : 1;
                const squeezeX = isSelected ? 1 - Math.abs(dragOffset.y) / 300 : 1;
                const squeezeY = isSelected ? 1 - Math.abs(dragOffset.x) / 300 : 1;
                const finalScaleX = stretchX * squeezeX * (isSelected ? 1.1 : 1);
                const finalScaleY = stretchY * squeezeY * (isSelected ? 1.1 : 1);
                
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
                          key={piece.id}
                          layout
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            x,
                            y,
                            scale: 1,
                            scaleX: finalScaleX,
                            scaleY: finalScaleY,
                            opacity: isSelected ? 0.85 : 1,
                            rotate: isSelected ? [0, -5, 5, -5, 0] : 0,
                            zIndex: isSelected ? 50 : 1
                          }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            type: 'spring', 
                            stiffness: isSelected ? 800 : 300, 
                            damping: isSelected ? 40 : 25,
                            rotate: { repeat: isSelected && dragOffset.x === 0 && dragOffset.y === 0 ? Infinity : 0, duration: 0.5 }
                          }}
                          className={`absolute inset-0 flex items-center justify-center pointer-events-none
                            ${isHinted ? 'ring-[5px] ring-red-500 ring-offset-2 ring-offset-white/30 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.9)] z-20 rounded-2xl' : ''}
                            ${isSelected ? 'backdrop-blur-md bg-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 ring-4 ring-blue-400 ring-offset-2 ring-offset-white/30 rounded-2xl' : ''}
                          `}
                        >
                          <img 
                            src={PIECE_CONFIG[piece.type].imgUrl} 
                            alt={PIECE_CONFIG[piece.type].name}
                            className="w-[95%] h-[95%] object-contain pointer-events-none drop-shadow-md"
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
        <div className="flex justify-between gap-3 sm:gap-4">
          <button
            onClick={() => startNewGame(level)}
            className="flex-1 bg-white/60 hover:bg-white/80 backdrop-blur-md border border-white/60 shadow-md rounded-full py-2 sm:py-3 flex flex-col items-center justify-center transition-all active:scale-95"
            aria-label="重新开始"
          >
            <RotateCcw size={20} className="text-gray-700 mb-1" />
            <span className="text-gray-800 font-bold text-xs sm:text-sm">重来</span>
          </button>
          
          <button
            onClick={handleNextLevel}
            className="flex-1 bg-gradient-to-b from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 backdrop-blur-md border border-pink-200 shadow-md rounded-full py-2 sm:py-3 flex flex-col items-center justify-center transition-all active:scale-95"
            aria-label="下一关"
          >
            <CheckCircle2 size={20} className="text-pink-600 mb-1" />
            <span className="text-pink-700 font-bold text-xs sm:text-sm">下一关</span>
          </button>

          <button
            onClick={handleHint}
            disabled={processing}
            className="flex-1 bg-white/60 hover:bg-white/80 backdrop-blur-md border border-white/60 shadow-md rounded-full py-2 sm:py-3 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            aria-label="获取提示"
          >
            <Lightbulb size={20} className="text-yellow-600 mb-1" />
            <span className="text-gray-800 font-bold text-xs sm:text-sm">提示</span>
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
                className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl mb-2 border-2 border-pink-200 relative flex flex-col items-center"
              >
                <span className="text-pink-600 font-bold text-xl">太棒啦！过关！</span>
                <span className="text-gray-500 text-xs mt-1">5秒后自动下一关</span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-pink-200 rotate-45"></div>
              </motion.div>
              <img 
                src="https://raw.githubusercontent.com/yichen20111030-del/PIC/d9c6cff7973d1124ed8cecf2ee5f64b63bad118a/nanzi.png" 
                alt="Success Character" 
                className="w-80 h-80 object-contain drop-shadow-2xl origin-bottom"
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
