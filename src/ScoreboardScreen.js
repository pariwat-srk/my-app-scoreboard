import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Vibration, useWindowDimensions,
} from 'react-native';
import { COLORS, SPORTS_CONFIG } from './constants';
import { formatTime } from './helpers';
import { styles, courtStyles } from './styles';
import { ChessClockScreen } from './ChessClockScreen';
import { GolfScreen } from './GolfScreen';

export function ScoreboardScreen({ config, onEndGame }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const sportConfig = SPORTS_CONFIG[config.sport] || (config.allSportsConfig && config.allSportsConfig[config.sport]);
  const isProMode = config.mode === 'pro';
  const isCasualMode = config.mode === 'casual';
  const isCustomMode = config.mode === 'custom';

  let scoreboardMode;
  if (sportConfig.type === 'golf') {
    scoreboardMode = 'golf';
  } else if (sportConfig.type === 'chessClock') {
    scoreboardMode = 'chessClock';
  } else if (isCasualMode) {
    scoreboardMode = 'casual';
  } else if (isCustomMode) {
    scoreboardMode = 'setBased';
  } else {
    scoreboardMode = sportConfig.type === 'periodBased' ? 'periodBased' : 'setBased';
  }

  // If golf, delegate to GolfScreen
  if (scoreboardMode === 'golf') {
    return <GolfScreen config={config} sportConfig={sportConfig} onEndGame={onEndGame} />;
  }

  // If chess clock, delegate to ChessClockScreen
  if (scoreboardMode === 'chessClock') {
    return <ChessClockScreen config={config} sportConfig={sportConfig} onEndGame={onEndGame} isLandscape={isLandscape} width={width} height={height} />;
  }

  const isCountdown = isProMode && sportConfig.proRules.timerType === 'countdown';
  const initialPeriodTime = isCountdown ? sportConfig.proRules.periodTime : 0;

  const [gameState, setGameState] = useState({
    scores: [0, 0],
    setsWon: [0, 0],
    currentSet: 1,
    currentPeriod: 1,
    setDetails: [],
    isGameOver: false,
    winner: null,
    foul: [0, 0],
  });
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [periodTime, setPeriodTime] = useState(initialPeriodTime);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [periodEnded, setPeriodEnded] = useState(false);
  const [undoStack, setUndoStack] = useState([]);

  const gameStateRef = useRef(gameState);
  const totalElapsedRef = useRef(totalElapsed);
  const timerRef = useRef(null);
  const setStartElapsedRef = useRef(0); // tracks when current set started

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { totalElapsedRef.current = totalElapsed; }, [totalElapsed]);

  useEffect(() => {
    if (isTimerRunning && !gameState.isGameOver) {
      timerRef.current = setInterval(() => {
        setTotalElapsed((prev) => prev + 1);
        if (isCountdown) {
          setPeriodTime((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              setPeriodEnded(true);
              Vibration.vibrate(500);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning, gameState.isGameOver, isCountdown]);

  const getTotalSets = () => {
    if (isProMode) return sportConfig.proRules.bestOf || 1;
    if (isCustomMode) return config.customSettings.totalSets;
    return 1;
  };
  const getSetsToWin = () => Math.ceil(getTotalSets() / 2);

  const getPointsToWin = () => {
    if (isCasualMode) return Infinity;
    if (isCustomMode) return config.customSettings.pointsToWin;
    if (isProMode) {
      if (config.sport === 'volleyball') {
        const isFinal = gameState.currentSet >= sportConfig.proRules.bestOf;
        return isFinal ? sportConfig.proRules.finalSetPoints : sportConfig.proRules.pointsToWin;
      }
      return sportConfig.proRules.pointsToWin;
    }
    return Infinity;
  };

  const getDeuceAt = () => {
    if (isCasualMode) return Infinity;
    if (isCustomMode) {
      return config.customSettings.deuceEnabled ? config.customSettings.pointsToWin - 1 : Infinity;
    }
    if (isProMode) {
      if (config.sport === 'volleyball') {
        const isFinal = gameState.currentSet >= sportConfig.proRules.bestOf;
        return isFinal ? sportConfig.proRules.finalSetDeuceAt : sportConfig.proRules.deuceAt;
      }
      return sportConfig.proRules.deuceAt;
    }
    return Infinity;
  };

  const getMaxPoints = () => (isProMode && sportConfig.proRules.maxPoints) ? sportConfig.proRules.maxPoints : null;

  const isInDeuce = () => {
    const d = getDeuceAt();
    return gameState.scores[0] >= d && gameState.scores[1] >= d;
  };

  const checkSetWin = (scores) => {
    if (scoreboardMode === 'casual' || scoreboardMode === 'periodBased') return null;
    const ptw = getPointsToWin();
    const maxPts = getMaxPoints();
    const deuceOn = isCustomMode ? config.customSettings.deuceEnabled : true;
    for (let i = 0; i < 2; i++) {
      const other = 1 - i;
      if (scores[i] >= ptw) {
        if (!deuceOn) return i;
        if (scores[i] - scores[other] >= 2) return i;
        if (maxPts && scores[i] >= maxPts) return i;
      }
    }
    return null;
  };

  const handleScore = (teamIndex, points) => {
    if (gameState.isGameOver || periodEnded) return;
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(gameState))]);
    const newScores = [...gameState.scores];
    newScores[teamIndex] += points;
    // Prevent score from going below 0
    if (newScores[teamIndex] < 0) newScores[teamIndex] = 0;
    if (scoreboardMode === 'setBased') {
      const setWinner = checkSetWin(newScores);
      if (setWinner !== null) { handleSetWon(setWinner, newScores); return; }
    }
    setGameState((prev) => ({ ...prev, scores: newScores }));
    Vibration.vibrate(30);
  };
  //////////////////////////////////////////////////////////
  const basketballFoul = (teamIndex) => {
  if (gameState.isGameOver) return;

  const newFoul = [...gameState.foul];

  if (newFoul[teamIndex] < 5) {   
    newFoul[teamIndex] += 1;

    setGameState((prev) => ({
      ...prev,
      foul: newFoul,
    }));

    Vibration.vibrate(30);
  }
};
///////////////////////////////////////////////////////////
  const handleSetWon = (setWinner, newScores) => {
    const setDuration = totalElapsedRef.current - setStartElapsedRef.current;
    const newSetDetails = [...gameState.setDetails, { scores: [...newScores], duration: setDuration }];
    const newSetsWon = [...gameState.setsWon];
    newSetsWon[setWinner]++;
    const setsToWin = getSetsToWin();
    if (newSetsWon[setWinner] >= setsToWin) {
      setGameState((prev) => ({ ...prev, scores: newScores, setsWon: newSetsWon, setDetails: newSetDetails, isGameOver: true, winner: setWinner }));
      setIsTimerRunning(false);
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      setTimeout(() => {
        Alert.alert('🎉 Game Over!', `Team ${setWinner === 0 ? 'A' : 'B'} ชนะแมตช์!\n\nเซ็ต: ${newSetsWon[0]} - ${newSetsWon[1]}`,
          [{ text: 'บันทึกผล', onPress: () => finishGame(setWinner) }]);
      }, 300);
      return;
    }
    setGameState((prev) => ({ ...prev, scores: newScores, setsWon: newSetsWon, setDetails: newSetDetails }));
    setStartElapsedRef.current = totalElapsedRef.current; // reset for the next set
    let msg = `Team ${setWinner === 0 ? 'A' : 'B'} ชนะเซ็ต ${gameState.currentSet}!\n\nเซ็ต: ${newSetsWon[0]} - ${newSetsWon[1]}`;
    if (config.sport === 'badminton' || config.sport === 'volleyball') msg += '\n\n🔄 สลับฝั่ง!';
    Vibration.vibrate([0, 150, 100, 150]);
    Alert.alert(`เซ็ต ${gameState.currentSet} จบ`, msg, [
      { text: 'เซ็ตถัดไป', onPress: () => setGameState((prev) => ({ ...prev, scores: [0, 0], currentSet: prev.currentSet + 1 })) },
    ]);
  };

  const handleNextPeriod = () => {
    const rules = sportConfig.proRules;
    const gs = gameStateRef.current;
    const nextPeriod = gs.currentPeriod + 1;
    if (config.sport === 'basketball') {
      const isLastReg = gs.currentPeriod === rules.periods;
      const isOT = gs.currentPeriod > rules.periods;
      if ((isLastReg || isOT) && gs.scores[0] !== gs.scores[1]) {
        const w = gs.scores[0] > gs.scores[1] ? 0 : 1;
        setGameState((prev) => ({ ...prev, isGameOver: true, winner: w }));
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        Alert.alert('🎉 Game Over!', `Team ${w === 0 ? 'A' : 'B'} ชนะ!\n\nScore: ${gs.scores[0]} - ${gs.scores[1]}`,
          [{ text: 'บันทึกผล', onPress: () => finishGame(w) }]);
        return;
      }
      if ((isLastReg || isOT) && gs.scores[0] === gs.scores[1]) {
        setGameState((prev) => ({ ...prev, currentPeriod: nextPeriod }));
        setPeriodTime(rules.overtimeTime);
        setPeriodEnded(false);
        setIsTimerRunning(true);
        Alert.alert('⏱ Overtime!', 'เสมอ! เข้าสู่ช่วงต่อเวลา 5 นาที');
        return;
      }
      setGameState((prev) => ({ ...prev, currentPeriod: nextPeriod }));
      setPeriodTime(rules.periodTime);
      setPeriodEnded(false);
      setIsTimerRunning(true);
    } else if (config.sport === 'football') {
      setGameState((prev) => ({ ...prev, currentPeriod: nextPeriod }));
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setGameState(undoStack[undoStack.length - 1]);
    setUndoStack((s) => s.slice(0, -1));
    Vibration.vibrate(30);
  };

  const handleReset = () => {
    Alert.alert('🔄 รีเซ็ตเกม', 'คุณแน่ใจหรือไม่? ข้อมูลทั้งหมดจะหายไป', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'รีเซ็ต', style: 'destructive',
        onPress: () => {
          setGameState({ scores: [0, 0], setsWon: [0, 0], currentSet: 1, currentPeriod: 1, setDetails: [], isGameOver: false, winner: null, foul: [0, 0],});
          setTotalElapsed(0); setPeriodTime(initialPeriodTime);
          setPeriodEnded(false); setUndoStack([]); setIsTimerRunning(true);
          setStartElapsedRef.current = 0;
        },
      },
    ]);
  };
  const handleEndGame = () => {
    Alert.alert('🏁 จบเกม', 'คุณแน่ใจหรือไม่ว่าต้องการจบเกมนี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'จบเกม', style: 'destructive',
        onPress: () => {
          setIsTimerRunning(false);
          const gs = gameStateRef.current;
          let winner = null;
          if (scoreboardMode === 'setBased') {
            if (gs.setsWon[0] > gs.setsWon[1]) winner = 0;
            else if (gs.setsWon[1] > gs.setsWon[0]) winner = 1;
            else if (gs.scores[0] > gs.scores[1]) winner = 0;
            else if (gs.scores[1] > gs.scores[0]) winner = 1;
          } else {
            if (gs.scores[0] > gs.scores[1]) winner = 0;
            else if (gs.scores[1] > gs.scores[0]) winner = 1;
          }
          finishGame(winner);
        },
      },
    ]);
  };

  const finishGame = (winner) => {
    setIsTimerRunning(false);
    const gs = gameStateRef.current;
    const te = totalElapsedRef.current;
    // Add current (in-progress) set time for the final/current set
    const lastSetDuration = te - setStartElapsedRef.current;
    const enrichedSetDetails = gs.setDetails.map((d) => ({ scores: [...d.scores], duration: d.duration || 0 }));
    // If current set has scores but wasn't finished, add it as well
    if (gs.scores[0] > 0 || gs.scores[1] > 0) {
      const alreadySaved = enrichedSetDetails.length >= gs.currentSet;
      if (!alreadySaved) {
        enrichedSetDetails.push({ scores: [...gs.scores], duration: lastSetDuration });
      }
    }
    onEndGame({
      id: Date.now(), sport: config.sport, sportName: sportConfig.name,
      sportEmoji: sportConfig.emoji, mode: config.mode,
      date: new Date().toISOString(), duration: te,
      scores: [...gs.scores], setsWon: [...gs.setsWon],
      setDetails: enrichedSetDetails,
      currentPeriod: gs.currentPeriod, winner,
    });
  };

  const toggleTimer = () => { if (!gameState.isGameOver) setIsTimerRunning((p) => !p); };

  const renderPeriodLabel = () => {
    if (scoreboardMode === 'setBased') return `เซ็ต ${gameState.currentSet} / ${getTotalSets()}`;
    if (scoreboardMode === 'periodBased' && isProMode) {
      const rules = sportConfig.proRules;
      if (gameState.currentPeriod > rules.periods) return `OT ${gameState.currentPeriod - rules.periods}`;
      return `${rules.periodNameLocal} ${gameState.currentPeriod} / ${rules.periods}`;
    }
    return '';
  };

  const timerDisplay = isCountdown ? formatTime(periodTime) : formatTime(totalElapsed);
  const canScore = !gameState.isGameOver && !periodEnded;

  const getPeriodButtonLabel = () => {
    if (config.sport === 'basketball') {
      const rules = sportConfig.proRules;
      const gs = gameStateRef.current;
      if (gs.currentPeriod >= rules.periods) {
        return gs.scores[0] === gs.scores[1] ? '⏱ เริ่ม OT' : '🏁 ดูผลลัพธ์';
      }
      return `▶ ควอเตอร์ ${gs.currentPeriod + 1}`;
    }
    if (config.sport === 'football') return `▶ ครึ่งที่ ${gameState.currentPeriod + 1}`;
    return '▶ ถัดไป';
  };

  // ---------- SPORT THEME COLORS ----------
  const COURT_THEMES = {
    football: {
      bg: '#1B8A3D',
      bgDark: '#14692E',
      bgLight: '#22A948',
      line: 'rgba(255,255,255,0.4)',
      circle: 'rgba(255,255,255,0.12)',
      teamAColor: '#FFFFFF',
      teamBColor: '#FFFFFF',
      scoreColor: '#FFFFFF',
    },
    basketball: {
      bg: '#2D1B4E',
      bgDark: '#1E1236',
      bgLight: '#3D2766',
      line: 'rgba(255,255,255,0.15)',
      zone1P: '#F7C948',
      zone2P: '#9B72CF',
      zone3P: '#6B4FA0',
      teamAColor: '#FFFFFF',
      teamBColor: '#FFFFFF',
      scoreColor: '#FFFFFF',
    },
    badminton: {
      bg: '#2E7D32',
      bgDark: '#1B5E20',
      bgLight: '#388E3C',
      line: 'rgba(255,255,255,0.5)',
      teamAColor: '#FFFFFF',
      teamBColor: '#FFFFFF',
      scoreColor: '#FFFFFF',
    },
    volleyball: {
      bg: '#E65100',
      bgDark: '#BF360C',
      bgSide: '#0D47A1',
      line: 'rgba(255,255,255,0.5)',
      teamAColor: '#FFFFFF',
      teamBColor: '#FFFFFF',
      scoreColor: '#FFFFFF',
    },
    tableTennis: {
      bg: '#1A237E',
      bgDark: '#0D1442',
      bgLight: '#283593',
      line: 'rgba(255,255,255,0.6)',
      teamAColor: '#FFFFFF',
      teamBColor: '#FFFFFF',
      scoreColor: '#FFFFFF',
    },
  };

  const getCourtTheme = () => {
    if (COURT_THEMES[config.sport]) return COURT_THEMES[config.sport];
    // User/custom sport: derive from sportConfig.color
    const c = sportConfig.color || '#5E5CE6';
    return {
      bg: c,
      bgDark: c + 'CC',
      bgLight: c + 'DD',
      line: 'rgba(255,255,255,0.3)',
      teamAColor: '#FFFFFF',
      teamBColor: '#FFFFFF',
      scoreColor: '#FFFFFF',
    };
  };
  const courtTheme = getCourtTheme();

  // ============================================================
  // SHARED OVERLAYS
  // ============================================================

  // Timer overlay (floating top-center)
  const renderTimerOverlay = (compact) => (
    <View style={courtStyles.timerOverlay}>
      <TouchableOpacity onPress={toggleTimer} activeOpacity={0.6} style={courtStyles.timerBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[courtStyles.timerIcon, isTimerRunning ? { color: '#3ee267' } : { color: '#FF9F0A' }]}>
            ⏱
          </Text>
          <Text style={[courtStyles.timerText, isTimerRunning ? { color: '#30D158' } : { color: '#FF9F0A' }]}>
            {timerDisplay}
          </Text>
          <Text style={courtStyles.timerPauseIcon}>{isTimerRunning ? '❚❚' : '▶'}</Text>
        </View>
        {isCountdown && (
          <Text style={courtStyles.timerElapsed}>รวม: {formatTime(totalElapsed)}</Text>
        )}
      </TouchableOpacity>
      {scoreboardMode !== 'casual' && (
        <Text style={courtStyles.periodLabel}>{renderPeriodLabel()}</Text>
      )}
    </View>
  );

  // Action buttons overlay (floating bottom-center)
  const renderActionOverlay = () => (
    <View style={courtStyles.actionOverlay}>
      <TouchableOpacity
        style={[courtStyles.actionButton, { borderColor: 'rgba(100,210,255,0.4)' }]}
        onPress={handleUndo} disabled={undoStack.length === 0} activeOpacity={0.7}
      >
        <Text style={[courtStyles.actionButtonText, undoStack.length === 0 && { opacity: 0.3 }]}>↩ Undo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[courtStyles.actionButton, { borderColor: 'rgba(255,69,58,0.4)', backgroundColor: 'rgba(255,69,58,0.15)' }]}
        onPress={handleEndGame} activeOpacity={0.7}
      >
        <Text style={[courtStyles.actionButtonText, { color: '#FF453A' }]}>🏁 จบเกม</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[courtStyles.actionButton, { borderColor: 'rgba(99,99,102,0.4)' }]}
        onPress={handleReset} activeOpacity={0.7}
      >
        <Text style={courtStyles.actionButtonText}>🔄 Reset</Text>
      </TouchableOpacity>
    </View>
  );
  // Period ended overlay
  const renderPeriodEndOverlay = () => {
    if (!periodEnded || !isProMode || scoreboardMode !== 'periodBased') return null;
    return (
      <View style={courtStyles.periodEndOverlay}>
        <View style={courtStyles.periodEndBox}>
          <Text style={courtStyles.periodEndText}>
            {config.sport === 'basketball'
              ? gameState.currentPeriod > sportConfig.proRules.periods
                ? `OT ${gameState.currentPeriod - sportConfig.proRules.periods} จบ`
                : `ควอเตอร์ ${gameState.currentPeriod} จบ`
              : `ครึ่งที่ ${gameState.currentPeriod} จบ`}
          </Text>
          <TouchableOpacity
            style={[courtStyles.periodNextBtn, { backgroundColor: sportConfig.color }]}
            onPress={handleNextPeriod} activeOpacity={0.75}
          >
            <Text style={courtStyles.periodNextBtnText}>{getPeriodButtonLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Football next half button
  const renderNextHalfButton = () => {
    if (config.sport !== 'football' || !isProMode || gameState.currentPeriod >= sportConfig.proRules.periods) return null;
    return (
      <View style={{ position: 'absolute', bottom: 60, alignSelf: 'center', zIndex: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: sportConfig.color }}
          onPress={handleNextPeriod} activeOpacity={0.7}
        >
          <Text style={{ color: sportConfig.color, fontWeight: '700', fontSize: 14 }}>▶ ครึ่งถัดไป</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Deuce indicator
  const renderDeuceOverlay = () => {
    if (!isInDeuce()) return null;
    return (
      <View style={courtStyles.deuceOverlay}>
        <Text style={courtStyles.deuceText}>🔥 DEUCE</Text>
      </View>
    );
  };

  // Set info overlay — positioned below the timer to avoid overlap
  const renderSetInfo = () => {
    if (scoreboardMode !== 'setBased' || getTotalSets() <= 1) return null;
    return (
      <View style={[courtStyles.setInfoOverlay, isLandscape ? { top: 6, left: 10, right: undefined, alignSelf: undefined } : { top: 50 }]} pointerEvents="none">
        <Text style={courtStyles.setInfoText}>
          Sets: {gameState.setsWon[0]} - {gameState.setsWon[1]}  |  เซ็ต {gameState.currentSet}/{getTotalSets()}
        </Text>
        {gameState.setDetails.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {gameState.setDetails.map((sd, idx) => (
              <Text key={idx} style={courtStyles.setDetailText}>S{idx + 1}: {sd.scores[0]}-{sd.scores[1]}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ============================================================
  // FOOTBALL COURT
  // ============================================================
  const renderFootballCourt = () => {
    const t = courtTheme;
    if (isLandscape) {
      // LANDSCAPE: left = Team A, right = Team B
      return (
        <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
          {/* Center line */}
          <View style={courtStyles.centerLineV} pointerEvents="none" />
          {/* Center circle */}
          <View style={[courtStyles.centerCircle, { width: height * 0.5, height: height * 0.5, borderRadius: height * 0.25 }]} pointerEvents="none" />

          {/* Team A (left half) */}
          <TouchableOpacity
            style={[courtStyles.halfLeft, { zIndex: 5 }]}
            onPress={() => handleScore(0, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: isLandscape ? 80 : 100 }]}>
              {gameState.scores[0]}
            </Text>
          </TouchableOpacity>

          {/* Team B (right half) */}
          <TouchableOpacity
            style={[courtStyles.halfRight, { zIndex: 5 }]}
            onPress={() => handleScore(1, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: isLandscape ? 80 : 100 }]}>
              {gameState.scores[1]}
            </Text>
          </TouchableOpacity>

          {renderTimerOverlay(true)}
          {renderActionOverlay()}
          {renderDeuceOverlay()}
          {renderSetInfo()}
          {renderPeriodEndOverlay()}
          {renderNextHalfButton()}
        </View>
      );
    }

    // PORTRAIT: top = Team A, bottom = Team B
    return (
      <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
        {/* Center line */}
        <View style={courtStyles.centerLineH} pointerEvents="none" />
        {/* Center circle */}
        <View style={[courtStyles.centerCircle, { width: width * 0.5, height: width * 0.5, borderRadius: width * 0.25 }]} pointerEvents="none" />

        {/* Team A (top half) */}
        <TouchableOpacity
          style={[courtStyles.halfTop, { zIndex: 5 }]}
          onPress={() => handleScore(0, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>
            {gameState.scores[0]}
          </Text>
        </TouchableOpacity>

        {/* Team B (bottom half) */}
        <TouchableOpacity
          style={[courtStyles.halfBottom, { zIndex: 5 }]}
          onPress={() => handleScore(1, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>
            {gameState.scores[1]}
          </Text>
        </TouchableOpacity>

        {renderTimerOverlay(false)}
        {renderActionOverlay()}
        {renderDeuceOverlay()}
        {renderSetInfo()}
        {renderPeriodEndOverlay()}
        {renderNextHalfButton()}
      </View>
    );
  };

  // ============================================================
  // BASKETBALL COURT
  // ============================================================
  const renderBasketballCourt = () => {
    const t = courtTheme;
    // Zone sizes: half-circles on the outer edges
    const zoneOuter = isLandscape ? Math.min(height * 0.9, width * 0.3) : Math.min(width * 0.7, height * 0.3);
    const zoneInner = zoneOuter * 0.55;

    // Render half-circle scoring zones on the outer edge of each team's half
    // 1P = innermost (free throw), 2P = middle, court background = 3P
    const renderScoringZones = (teamIndex, isLeft) => {
      if (isLandscape) {
        // Half-circles on left/right edges
        const edgeStyle = isLeft
          ? { left: -zoneOuter / 2, top: '50%', marginTop: -zoneOuter / 2 }
          : { right: -zoneOuter / 2, top: '50%', marginTop: -zoneOuter / 2 };
        const edgeInnerStyle = isLeft
          ? { left: -zoneInner / 2, top: '50%', marginTop: -zoneInner / 2 }
          : { right: -zoneInner / 2, top: '50%', marginTop: -zoneInner / 2 };

        return (
          <>
            {/* 2P outer half-circle (purple-light) */}
            <TouchableOpacity
              style={[{
                position: 'absolute', width: zoneOuter, height: zoneOuter, borderRadius: zoneOuter / 2,
                backgroundColor: t.zone2P, justifyContent: 'center', alignItems: 'center',
                opacity: canScore ? 1 : 0.4, zIndex: 6,
              }, edgeStyle]}
              onPress={() => handleScore(teamIndex, 2)}
              disabled={!canScore} activeOpacity={0.7}
            >
              <Text style={[courtStyles.zoneLabel2P, { marginLeft: isLeft ? zoneOuter * 0.25 : 0, marginRight: isLeft ? 0 : zoneOuter * 0.25 }]}>2P</Text>
            </TouchableOpacity>

            {/* 1P inner half-circle (yellow) */}
            <TouchableOpacity
              style={[{
                position: 'absolute', width: zoneInner, height: zoneInner, borderRadius: zoneInner / 2,
                backgroundColor: t.zone1P, justifyContent: 'center', alignItems: 'center',
                opacity: canScore ? 1 : 0.4, zIndex: 7,
              }, edgeInnerStyle]}
              onPress={() => handleScore(teamIndex, 1)}
              disabled={!canScore} activeOpacity={0.7}
            >
              <Text style={[courtStyles.zoneLabel1P, { position: 'relative', top: 0, marginLeft: isLeft ? zoneInner * 0.2 : 0, marginRight: isLeft ? 0 : zoneInner * 0.2 }]}>1P</Text>
            </TouchableOpacity>
          </>
        );
      }

      // PORTRAIT: half-circles on top/bottom edges
      const isTop = teamIndex === 0;
      const edgeStyle = isTop
        ? { top: -zoneOuter / 2, left: '50%', marginLeft: -zoneOuter / 2 }
        : { bottom: -zoneOuter / 2, left: '50%', marginLeft: -zoneOuter / 2 };
      const edgeInnerStyle = isTop
        ? { top: -zoneInner / 2, left: '50%', marginLeft: -zoneInner / 2 }
        : { bottom: -zoneInner / 2, left: '50%', marginLeft: -zoneInner / 2 };

      return (
        <>
          {/* 2P outer half-circle */}
          <TouchableOpacity
            style={[{
              position: 'absolute', width: zoneOuter, height: zoneOuter, borderRadius: zoneOuter / 2,
              backgroundColor: t.zone2P, justifyContent: 'center', alignItems: 'center',
              opacity: canScore ? 1 : 0.4, zIndex: 6,
            }, edgeStyle]}
            onPress={() => handleScore(teamIndex, 2)}
            disabled={!canScore} activeOpacity={0.7}
          >
            <Text style={[courtStyles.zoneLabel2P, { marginTop: isTop ? zoneOuter * 0.25 : 0, marginBottom: isTop ? 0 : zoneOuter * 0.25 }]}>2P</Text>
          </TouchableOpacity>

          {/* 1P inner half-circle */}
          <TouchableOpacity
            style={[{
              position: 'absolute', width: zoneInner, height: zoneInner, borderRadius: zoneInner / 2,
              backgroundColor: t.zone1P, justifyContent: 'center', alignItems: 'center',
              opacity: canScore ? 1 : 0.4, zIndex: 7,
            }, edgeInnerStyle]}
            onPress={() => handleScore(teamIndex, 1)}
            disabled={!canScore} activeOpacity={0.7}
          >
            <Text style={[courtStyles.zoneLabel1P, { position: 'relative', top: 0, marginTop: isTop ? zoneInner * 0.15 : 0, marginBottom: isTop ? 0 : zoneInner * 0.15 }]}>1P</Text>
          </TouchableOpacity>
        </>
      );
    };

    if (isLandscape) {
      return (
        <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
          {/* Center line */}
          <View style={courtStyles.centerLineV} />

          {/* Team A left — tapping court = 3P */}
          <TouchableOpacity
            style={courtStyles.halfLeft}
            onPress={() => handleScore(0, 3)}
            disabled={!canScore} activeOpacity={0.85}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 70 }]}>
              {gameState.scores[0]} 
            </Text>
            <Text style={courtStyles.zoneLabelBg}>3P</Text>
          </TouchableOpacity>
          {renderScoringZones(0, true)}

          {/* Team B right — tapping court = 3P */}
          <TouchableOpacity
            style={courtStyles.halfRight}
            onPress={() => handleScore(1, 3)}
            disabled={!canScore} activeOpacity={0.85}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 70 }]}>
              {gameState.scores[1]}
            </Text>
            <Text style={courtStyles.zoneLabelBg}>3P</Text>
          </TouchableOpacity>
          {renderScoringZones(1, false)}

          {renderTimerOverlay(true)}
          {renderActionOverlay()}
          {renderDeuceOverlay()}
          {renderSetInfo()}
          {renderPeriodEndOverlay()}
          {bottombasketball()}
        </View>
      );
    }

    // PORTRAIT
    return (
      <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
        {/* Center line */}
        <View style={courtStyles.centerLineH} />

        {/* Team A top — tapping court = 3P */}
        <TouchableOpacity
          style={courtStyles.halfTop}
          onPress={() => handleScore(0, 3)}
          disabled={!canScore} activeOpacity={0.85}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamAColor, marginTop: 40 }]}>Team A</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 70 }]}>
            {gameState.scores[0]}
          </Text>
          <Text style={[courtStyles.zoneLabelBg, { bottom: 12 }]}>3P</Text>
        </TouchableOpacity>
        {renderScoringZones(0, false)}

        {/* Team B bottom — tapping court = 3P */}
        <TouchableOpacity
          style={courtStyles.halfBottom}
          onPress={() => handleScore(1, 3)}
          disabled={!canScore} activeOpacity={0.85}
        >
          <Text style={[courtStyles.zoneLabelBg, { top: 12 }]}>3P</Text>
          <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 70 }]}>
            {gameState.scores[1]}
          </Text>
        </TouchableOpacity>
        {renderScoringZones(1, false)}

        {renderTimerOverlay(false)}
        {renderActionOverlay()}
        {renderDeuceOverlay()}
        {renderSetInfo()}
        {renderPeriodEndOverlay()}
      </View>
    );
  };

  // ============================================================
  // BADMINTON COURT
  // ============================================================
  const renderBadmintonCourt = () => {
    const t = courtTheme;
    if (isLandscape) {
      return (
        <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
          {/* Decorations — pointerEvents none so they don't block taps */}
          <View style={courtStyles.centerLineV} pointerEvents="none" />
          <View style={courtStyles.courtBoundary} pointerEvents="none" />
          <View style={[courtStyles.serviceLineV, { left: '25%' }]} pointerEvents="none" />
          <View style={[courtStyles.serviceLineV, { right: '25%' }]} pointerEvents="none" />

          <TouchableOpacity
            style={[courtStyles.halfLeft, { zIndex: 5 }]}
            onPress={() => handleScore(0, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 80 }]}>{gameState.scores[0]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[courtStyles.halfRight, { zIndex: 5 }]}
            onPress={() => handleScore(1, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 80 }]}>{gameState.scores[1]}</Text>
          </TouchableOpacity>

          {renderTimerOverlay(true)}
          {renderActionOverlay()}
          {renderDeuceOverlay()}
          {renderSetInfo()}
          {renderPeriodEndOverlay()}
        </View>
      );
    }

    return (
      <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
        <View style={courtStyles.centerLineH} pointerEvents="none" />
        <View style={courtStyles.courtBoundaryPortrait} pointerEvents="none" />
        <View style={[courtStyles.serviceLineH, { top: '25%' }]} pointerEvents="none" />
        <View style={[courtStyles.serviceLineH, { bottom: '25%' }]} pointerEvents="none" />

        <TouchableOpacity
          style={[courtStyles.halfTop, { zIndex: 5 }]}
          onPress={() => handleScore(0, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>{gameState.scores[0]}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[courtStyles.halfBottom, { zIndex: 5 }]}
          onPress={() => handleScore(1, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>{gameState.scores[1]}</Text>
        </TouchableOpacity>

        {renderTimerOverlay(false)}
        {renderActionOverlay()}
        {renderDeuceOverlay()}
        {renderSetInfo()}
        {renderPeriodEndOverlay()}
      </View>
    );
  };

  // ============================================================
  // VOLLEYBALL COURT
  // ============================================================
  const renderVolleyballCourt = () => {
    const t = courtTheme;
    if (isLandscape) {
      return (
        <View style={[courtStyles.courtContainer, { backgroundColor: '#1565C0' }]}>
          {/* Decorations — pointerEvents none */}
          <View style={[courtStyles.centerLineV, { backgroundColor: 'rgba(255,255,255,0.7)', width: 3 }]} pointerEvents="none" />
          <View style={[courtStyles.serviceLineV, { left: '35%', backgroundColor: 'rgba(255,255,255,0.25)' }]} pointerEvents="none" />
          <View style={[courtStyles.serviceLineV, { right: '35%', backgroundColor: 'rgba(255,255,255,0.25)' }]} pointerEvents="none" />

          <TouchableOpacity
            style={[courtStyles.halfLeft, { backgroundColor: '#E65100', zIndex: 5 }]}
            onPress={() => handleScore(0, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 80 }]}>{gameState.scores[0]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[courtStyles.halfRight, { backgroundColor: '#0D47A1', zIndex: 5 }]}
            onPress={() => handleScore(1, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 80 }]}>{gameState.scores[1]}</Text>
          </TouchableOpacity>

          {renderTimerOverlay(true)}
          {renderActionOverlay()}
          {renderDeuceOverlay()}
          {renderSetInfo()}
          {renderPeriodEndOverlay()}
        </View>
      );
    }
    return (
      <View style={[courtStyles.courtContainer, { backgroundColor: '#1565C0' }]}>
        <View style={[courtStyles.centerLineH, { backgroundColor: 'rgba(255,255,255,0.7)', height: 3 }]} pointerEvents="none" />
        <View style={[courtStyles.serviceLineH, { top: '35%', backgroundColor: 'rgba(255,255,255,0.25)' }]} pointerEvents="none" />
        <View style={[courtStyles.serviceLineH, { bottom: '35%', backgroundColor: 'rgba(255,255,255,0.25)' }]} pointerEvents="none" />

        <TouchableOpacity
          style={[courtStyles.halfTop, { backgroundColor: '#E65100', zIndex: 5 }]}
          onPress={() => handleScore(0, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>{gameState.scores[0]}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[courtStyles.halfBottom, { backgroundColor: '#0D47A1', zIndex: 5 }]}
          onPress={() => handleScore(1, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>{gameState.scores[1]}</Text>
        </TouchableOpacity>

        {renderTimerOverlay(false)}
        {renderActionOverlay()}
        {renderDeuceOverlay()}
        {renderSetInfo()}
        {renderPeriodEndOverlay()}
      </View>
    );
  };

  // ============================================================
  // TABLE TENNIS COURT
  // ============================================================
  const renderTableTennisCourt = () => {
    const t = courtTheme;
    if (isLandscape) {
      return (
        <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
          {/* Decorations — pointerEvents none */}
          <View style={[courtStyles.centerLineV, { backgroundColor: 'rgba(255,255,255,0.7)', width: 3 }]} pointerEvents="none" />
          <View style={[courtStyles.courtBoundary, { borderColor: 'rgba(255,255,255,0.5)', borderWidth: 3 }]} pointerEvents="none" />
          <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 2 }} pointerEvents="none" />

          <TouchableOpacity
            style={[courtStyles.halfLeft, { zIndex: 5 }]}
            onPress={() => handleScore(0, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 80 }]}>{gameState.scores[0]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[courtStyles.halfRight, { zIndex: 5 }]}
            onPress={() => handleScore(1, 1)}
            disabled={!canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
            <Text style={[courtStyles.courtScore, { color: t.scoreColor, fontSize: 80 }]}>{gameState.scores[1]}</Text>
          </TouchableOpacity>

          {renderTimerOverlay(true)}
          {renderActionOverlay()}
          {renderDeuceOverlay()}
          {renderSetInfo()}
          {renderPeriodEndOverlay()}
        </View>
      );
    }

    return (
      <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
        <View style={[courtStyles.centerLineH, { backgroundColor: 'rgba(255,255,255,0.7)', height: 3 }]} pointerEvents="none" />
        <View style={[courtStyles.courtBoundaryPortrait, { borderColor: 'rgba(255,255,255,0.5)', borderWidth: 3 }]} pointerEvents="none" />
        <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 2 }} pointerEvents="none" />

        <TouchableOpacity
          style={[courtStyles.halfTop, { zIndex: 5 }]}
          onPress={() => handleScore(0, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamAColor }]}>Team A</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>{gameState.scores[0]}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[courtStyles.halfBottom, { zIndex: 5 }]}
          onPress={() => handleScore(1, 1)}
          disabled={!canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: t.teamBColor }]}>Team B</Text>
          <Text style={[courtStyles.courtScore, { color: t.scoreColor }]}>{gameState.scores[1]}</Text>
        </TouchableOpacity>

        {renderTimerOverlay(false)}
        {renderActionOverlay()}
        {renderDeuceOverlay()}
        {renderSetInfo()}
        {renderPeriodEndOverlay()}
      </View>
    );
  };

  // ============================================================
  // DEFAULT / CUSTOM SPORT COURT
  // ============================================================
  // Determine effective score buttons (custom mode overrides)
  const getEffectiveScoreButtons = () => {
    if (isCustomMode && config.customSettings.scoreButtons && config.customSettings.scoreButtons.length > 0) {
      return config.customSettings.scoreButtons;
    }
    return sportConfig.scoreButtons || [1];
  };
  const getEffectiveScoreLabels = () => {
    if (isCustomMode && config.customSettings.scoreButtons) {
      return null; // custom mode buttons don't have labels currently
    }
    return sportConfig.scoreLabels || null;
  };

  const renderDefaultCourt = () => {
    const t = courtTheme;
    const effectiveButtons = getEffectiveScoreButtons();
    const effectiveLabels = getEffectiveScoreLabels();
    const hasMultiScore = effectiveButtons.length > 1;

    // If has multiple score buttons (like basketball), show button-style zones
    const renderMultiScoreButtons = (teamIndex) => (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' }}>
        {effectiveButtons.map((pts, idx) => (
          <TouchableOpacity
            key={`${teamIndex}-${pts}-${idx}`}
            style={{
              minWidth: 50, height: 50, borderRadius: 25,
              backgroundColor: pts < 0 ? 'rgba(255,69,58,0.25)' : 'rgba(255,255,255,0.2)',
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 2, borderColor: pts < 0 ? 'rgba(255,69,58,0.6)' : 'rgba(255,255,255,0.4)',
              opacity: canScore ? 1 : 0.4,
            }}
            onPress={() => handleScore(teamIndex, pts)}
            disabled={!canScore} activeOpacity={0.7}
          >
            <Text style={{ color: pts < 0 ? '#FF6B6B' : '#fff', fontWeight: '800', fontSize: 16 }}>
              {pts > 0 ? '+' : ''}{pts}
            </Text>
            {effectiveLabels && effectiveLabels[idx] ? (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '600' }}>
                {effectiveLabels[idx]}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    );

    if (isLandscape) {
      return (
        <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
          <View style={courtStyles.centerLineV} />

          <TouchableOpacity
            style={courtStyles.halfLeft}
            onPress={hasMultiScore ? undefined : () => handleScore(0, effectiveButtons[0])}
            disabled={hasMultiScore ? true : !canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: '#fff' }]}>Team A</Text>
            <Text style={[courtStyles.courtScore, { color: '#fff', fontSize: 70 }]}>{gameState.scores[0]}</Text>
            {hasMultiScore && renderMultiScoreButtons(0)}
          </TouchableOpacity>

          <TouchableOpacity
            style={courtStyles.halfRight}
            onPress={hasMultiScore ? undefined : () => handleScore(1, effectiveButtons[0])}
            disabled={hasMultiScore ? true : !canScore} activeOpacity={0.8}
          >
            <Text style={[courtStyles.courtTeamName, { color: '#fff' }]}>Team B</Text>
            <Text style={[courtStyles.courtScore, { color: '#fff', fontSize: 70 }]}>{gameState.scores[1]}</Text>
            {hasMultiScore && renderMultiScoreButtons(1)}
          </TouchableOpacity>

          {renderTimerOverlay(true)}
          {renderActionOverlay()}
          {renderDeuceOverlay()}
          {renderSetInfo()}
          {renderPeriodEndOverlay()}
        </View>
      );
    }

    return (
      <View style={[courtStyles.courtContainer, { backgroundColor: t.bg }]}>
        <View style={courtStyles.centerLineH} />

        <TouchableOpacity
          style={courtStyles.halfTop}
          onPress={hasMultiScore ? undefined : () => handleScore(0, effectiveButtons[0])}
          disabled={hasMultiScore ? true : !canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: '#fff' }]}>Team A</Text>
          <Text style={[courtStyles.courtScore, { color: '#fff' }]}>{gameState.scores[0]}</Text>
          {hasMultiScore && renderMultiScoreButtons(0)}
        </TouchableOpacity>

        <TouchableOpacity
          style={courtStyles.halfBottom}
          onPress={hasMultiScore ? undefined : () => handleScore(1, effectiveButtons[0])}
          disabled={hasMultiScore ? true : !canScore} activeOpacity={0.8}
        >
          <Text style={[courtStyles.courtTeamName, { color: '#fff' }]}>Team B</Text>
          <Text style={[courtStyles.courtScore, { color: '#fff' }]}>{gameState.scores[1]}</Text>
          {hasMultiScore && renderMultiScoreButtons(1)}
        </TouchableOpacity>

        {renderTimerOverlay(false)}
        {renderActionOverlay()}
        {renderDeuceOverlay()}
        {renderSetInfo()}
        {renderPeriodEndOverlay()}
      </View>
    );
  };

  // ============================================================
  // MAIN RENDER — choose court by sport
  // ============================================================
  // If custom mode has different score buttons than the sport default, use generic court
  const effectiveBtns = getEffectiveScoreButtons();
  const useCustomCourt = isCustomMode && (
    effectiveBtns.length > 1 ||
    (effectiveBtns.length === 1 && effectiveBtns[0] !== 1) ||
    effectiveBtns.some(v => v < 0)
  );

  switch (config.sport) {
    case 'football': return useCustomCourt ? renderDefaultCourt() : renderFootballCourt();
    case 'basketball': return useCustomCourt ? renderDefaultCourt() : renderBasketballCourt();
    case 'badminton': return useCustomCourt ? renderDefaultCourt() : renderBadmintonCourt();
    case 'volleyball': return useCustomCourt ? renderDefaultCourt() : renderVolleyballCourt();
    case 'tableTennis': return useCustomCourt ? renderDefaultCourt() : renderTableTennisCourt();
    default: return renderDefaultCourt();
  }
}
