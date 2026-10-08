import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Vibration,
} from 'react-native';
import { formatTime } from './helpers';

export function ChessClockScreen({ config, sportConfig, onEndGame, isLandscape, width, height }) {
  const isProMode = config.mode === 'pro';
  const isCustomMode = config.mode === 'custom';

  // Determine time settings
  const getInitialTime = () => {
    if (isCustomMode && config.customSettings.timePerPlayer) {
      return config.customSettings.timePerPlayer * 60; // minutes to seconds
    }
    if (isProMode) return sportConfig.proRules.timePerPlayer || 600;
    return 600; // default 10 min
  };
  const getIncrement = () => {
    if (isCustomMode && config.customSettings.increment != null) {
      return config.customSettings.increment;
    }
    if (isProMode) return sportConfig.proRules.increment || 0;
    return 0;
  };

  const initialTime = getInitialTime();
  const increment = getIncrement();

  const [times, setTimes] = useState([initialTime, initialTime]);
  const [activePlayer, setActivePlayer] = useState(null); // 0 or 1, null=paused
  const [moves, setMoves] = useState([0, 0]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const timesRef = useRef(times);
  const activeRef = useRef(activePlayer);
  const timerRef = useRef(null);
  const totalElapsedRef = useRef(0);

  useEffect(() => { timesRef.current = times; }, [times]);
  useEffect(() => { activeRef.current = activePlayer; }, [activePlayer]);
  useEffect(() => { totalElapsedRef.current = totalElapsed; }, [totalElapsed]);

  // Timer effect — ticks every 100ms for smooth display
  useEffect(() => {
    if (activePlayer !== null && !isGameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTotalElapsed((p) => p + 1);
        setTimes((prev) => {
          const newTimes = [...prev];
          newTimes[activeRef.current] -= 1;
          if (newTimes[activeRef.current] <= 0) {
            newTimes[activeRef.current] = 0;
            clearInterval(timerRef.current);
            setIsGameOver(true);
            setWinner(1 - activeRef.current); // the other player wins
            Vibration.vibrate([0, 300, 150, 300, 150, 500]);
            setTimeout(() => {
              Alert.alert(
                '⏰ หมดเวลา!',
                `Player ${activeRef.current === 0 ? '1 (ขาว)' : '2 (ดำ)'} หมดเวลา!\nPlayer ${activeRef.current === 0 ? '2 (ดำ)' : '1 (ขาว)'} ชนะ!`,
                [{ text: 'บันทึกผล', onPress: () => finishGame(1 - activeRef.current) }]
              );
            }, 300);
          }
          return newTimes;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activePlayer, isGameOver, isPaused]);

  // Tap to switch
  const handleTap = (player) => {
    if (isGameOver) return;
    if (activePlayer === null) {
      // First tap starts the clock — player 0 (white) goes first
      setActivePlayer(0);
      return;
    }
    if (activePlayer !== player) return; // can only tap your own side
    // Switch to other player
    const newMoves = [...moves];
    newMoves[player]++;
    setMoves(newMoves);
    // Add increment
    if (increment > 0) {
      setTimes((prev) => {
        const t = [...prev];
        t[player] += increment;
        return t;
      });
    }
    setActivePlayer(1 - player);
    Vibration.vibrate(30);
  };

  const handlePause = () => {
    if (isGameOver || activePlayer === null) return;
    setIsPaused((p) => !p);
  };

  const handleReset = () => {
    Alert.alert('🔄 รีเซ็ต', 'รีเซ็ตนาฬิกาหมากรุก?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'รีเซ็ต', style: 'destructive',
        onPress: () => {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimes([initialTime, initialTime]);
          setActivePlayer(null);
          setMoves([0, 0]);
          setIsGameOver(false);
          setWinner(null);
          setIsPaused(false);
          setTotalElapsed(0);
        },
      },
    ]);
  };

  const handleEndGame = () => {
    Alert.alert('🏁 จบเกม', 'จบเกมหมากรุก?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'Player 1 ชนะ', onPress: () => finishGame(0) },
      { text: 'Player 2 ชนะ', onPress: () => finishGame(1) },
      { text: 'เสมอ', onPress: () => finishGame(null) },
    ]);
  };

  const finishGame = (w) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsGameOver(true);
    const te = totalElapsedRef.current;
    onEndGame({
      id: Date.now(), sport: config.sport, sportName: sportConfig.name,
      sportEmoji: sportConfig.emoji, mode: config.mode,
      date: new Date().toISOString(), duration: te,
      scores: [moves[0], moves[1]], setsWon: [0, 0],
      setDetails: [
        { scores: [formatTime(initialTime - timesRef.current[0]), formatTime(initialTime - timesRef.current[1])], duration: te },
      ],
      currentPeriod: 1, winner: w,
      chessData: {
        timesRemaining: [...timesRef.current],
        moves: [...moves],
        initialTime, increment,
      },
    });
  };

  // Format time with leading zeros
  const fmtChessTime = (secs) => {
    if (secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Colors
  const p1Active = activePlayer === 0 && !isPaused;
  const p2Active = activePlayer === 1 && !isPaused;
  const p1Bg = p1Active ? '#F5F0E1' : '#E8E0CC';
  const p2Bg = p2Active ? '#2C2C2C' : '#1A1A1A';
  const p1Text = '#1A1A1A';
  const p2Text = '#F5F0E1';
  const p1TimerColor = times[0] < 30 ? '#CC0000' : p1Active ? '#1A1A1A' : '#666';
  const p2TimerColor = times[1] < 30 ? '#FF4444' : p2Active ? '#F5F0E1' : '#777';

  // Get status text
  const getStatusText = () => {
    if (isGameOver) return winner === 0 ? 'Player 1 ชนะ!' : winner === 1 ? 'Player 2 ชนะ!' : 'เสมอ!';
    if (activePlayer === null) return 'กดเพื่อเริ่ม';
    if (isPaused) return '⏸ หยุดชั่วคราว';
    return `Player ${activePlayer + 1} กำลังคิด...`;
  };

  // ---- RENDER ----
  if (isLandscape) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Player 1 (White) — LEFT */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: p1Bg, justifyContent: 'center', alignItems: 'center', opacity: isGameOver && winner !== 0 ? 0.5 : 1 }}
          onPress={() => handleTap(0)}
          disabled={isGameOver}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: p1Text, opacity: 0.5, letterSpacing: 1 }}>♔ PLAYER 1 (ขาว)</Text>
          <Text style={{ fontSize: 64, fontWeight: '900', color: p1TimerColor, marginTop: 4, fontVariant: ['tabular-nums'] }}>
            {fmtChessTime(times[0])}
          </Text>
          <Text style={{ fontSize: 14, color: p1Text, opacity: 0.4, marginTop: 4 }}>เดิน {moves[0]} ครั้ง</Text>
          {p1Active && <View style={{ position: 'absolute', bottom: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: '#30D158' }} />}
        </TouchableOpacity>

        {/* Center bar */}
        <View style={{ width: 56, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#999', fontSize: 10, textAlign: 'center', marginBottom: 8 }}>{getStatusText()}</Text>
          {increment > 0 && <Text style={{ color: '#666', fontSize: 9 }}>+{increment}s</Text>}
          <View style={{ marginTop: 12, gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={handlePause} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>{isPaused ? '▶' : '❚❚'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEndGame} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,69,58,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#FF453A', fontSize: 14 }}>🏁</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#aaa', fontSize: 14 }}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Player 2 (Black) — RIGHT */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: p2Bg, justifyContent: 'center', alignItems: 'center', opacity: isGameOver && winner !== 1 ? 0.5 : 1 }}
          onPress={() => handleTap(1)}
          disabled={isGameOver}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: p2Text, opacity: 0.5, letterSpacing: 1 }}>♚ PLAYER 2 (ดำ)</Text>
          <Text style={{ fontSize: 64, fontWeight: '900', color: p2TimerColor, marginTop: 4, fontVariant: ['tabular-nums'] }}>
            {fmtChessTime(times[1])}
          </Text>
          <Text style={{ fontSize: 14, color: p2Text, opacity: 0.4, marginTop: 4 }}>เดิน {moves[1]} ครั้ง</Text>
          {p2Active && <View style={{ position: 'absolute', bottom: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: '#30D158' }} />}
        </TouchableOpacity>
      </View>
    );
  }

  // PORTRAIT — Player 2 on top (rotated 180°), Player 1 on bottom
  return (
    <View style={{ flex: 1 }}>
      {/* Player 2 (Black) — TOP, rotated so they can read it from the other side */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: p2Bg, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }], opacity: isGameOver && winner !== 1 ? 0.5 : 1 }}
        onPress={() => handleTap(1)}
        disabled={isGameOver}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: p2Text, opacity: 0.5, letterSpacing: 1 }}>♚ PLAYER 2 (ดำ)</Text>
        <Text style={{ fontSize: 72, fontWeight: '900', color: p2TimerColor, marginTop: 6, fontVariant: ['tabular-nums'] }}>
          {fmtChessTime(times[1])}
        </Text>
        <Text style={{ fontSize: 14, color: p2Text, opacity: 0.4, marginTop: 6 }}>เดิน {moves[1]} ครั้ง</Text>
        {p2Active && <View style={{ position: 'absolute', bottom: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: '#30D158' }} />}
      </TouchableOpacity>

      {/* Center bar */}
      <View style={{ height: 56, backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 12 }}>
        <Text style={{ color: '#999', fontSize: 11, flex: 1 }}>{getStatusText()}</Text>
        {increment > 0 && <Text style={{ color: '#666', fontSize: 10 }}>+{increment}s</Text>}
        <TouchableOpacity onPress={handlePause} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 14 }}>{isPaused ? '▶' : '❚❚'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleEndGame} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,69,58,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#FF453A', fontSize: 12 }}>🏁</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReset} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#aaa', fontSize: 12 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Player 1 (White) — BOTTOM */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: p1Bg, justifyContent: 'center', alignItems: 'center', opacity: isGameOver && winner !== 0 ? 0.5 : 1 }}
        onPress={() => handleTap(0)}
        disabled={isGameOver}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: p1Text, opacity: 0.5, letterSpacing: 1 }}>♔ PLAYER 1 (ขาว)</Text>
        <Text style={{ fontSize: 72, fontWeight: '900', color: p1TimerColor, marginTop: 6, fontVariant: ['tabular-nums'] }}>
          {fmtChessTime(times[0])}
        </Text>
        <Text style={{ fontSize: 14, color: p1Text, opacity: 0.4, marginTop: 6 }}>เดิน {moves[0]} ครั้ง</Text>
        {p1Active && <View style={{ position: 'absolute', bottom: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: '#30D158' }} />}
      </TouchableOpacity>
    </View>
  );
}
