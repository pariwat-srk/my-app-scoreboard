import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Vibration, useWindowDimensions,
} from 'react-native';
import { COLORS } from './constants';
import { formatTime } from './helpers';
import { styles } from './styles';

export function GolfScreen({ config, sportConfig, onEndGame }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const totalHoles = config.customSettings?.totalHoles || 9;
  const startingHole = config.customSettings?.startingHole || 1;

  // Phase: 'askPar' | 'playing' | 'done'
  const [phase, setPhase] = useState('askPar');
  const [currentHoleIdx, setCurrentHoleIdx] = useState(0);
  const [holes, setHoles] = useState(
    Array.from({ length: totalHoles }, (_, i) => ({ holeNumber: startingHole + i, par: 0, strokes: 0 }))
  );
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [undoStack, setUndoStack] = useState([]); // undo history
  const [showScorecard, setShowScorecard] = useState(false); // mini scorecard toggle
  const timerRef = useRef(null);
  const totalElapsedRef = useRef(0);

  useEffect(() => { totalElapsedRef.current = totalElapsed; }, [totalElapsed]);

  // Timer
  useEffect(() => {
    if (isTimerRunning && phase !== 'done') {
      timerRef.current = setInterval(() => setTotalElapsed((p) => p + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning, phase]);

  const currentHole = holes[currentHoleIdx];

  // Save undo state before any change
  const pushUndo = () => {
    setUndoStack((prev) => [...prev, { holes: JSON.parse(JSON.stringify(holes)), currentHoleIdx, phase }]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setHoles(last.holes);
    setCurrentHoleIdx(last.currentHoleIdx);
    setPhase(last.phase);
    setUndoStack((s) => s.slice(0, -1));
    Vibration.vibrate(30);
  };

  const selectPar = (par) => {
    pushUndo();
    setHoles((prev) => {
      const n = [...prev];
      n[currentHoleIdx] = { ...n[currentHoleIdx], par, strokes: 1 };
      return n;
    });
    setPhase('playing');
    Vibration.vibrate(30);
  };

  const addStroke = (delta) => {
    pushUndo();
    setHoles((prev) => {
      const n = [...prev];
      const newStrokes = Math.max(1, n[currentHoleIdx].strokes + delta);
      n[currentHoleIdx] = { ...n[currentHoleIdx], strokes: newStrokes };
      return n;
    });
    Vibration.vibrate(20);
  };

  const confirmHole = () => {
    pushUndo();
    if (currentHoleIdx < totalHoles - 1) {
      setCurrentHoleIdx((i) => i + 1);
      setPhase('askPar');
    } else {
      setPhase('done');
      setIsTimerRunning(false);
      Vibration.vibrate([0, 200, 100, 200]);
    }
  };

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalStrokes = holes.reduce((s, h) => s + h.strokes, 0);
    const totalPar = holes.reduce((s, h) => s + h.par, 0);
    const diff = totalStrokes - totalPar;
    onEndGame({
      id: Date.now(), sport: config.sport, sportName: sportConfig.name,
      sportEmoji: sportConfig.emoji, mode: config.mode || 'golf',
      date: new Date().toISOString(), duration: totalElapsedRef.current,
      scores: [totalStrokes, 0], setsWon: [0, 0],
      setDetails: holes.map((h) => ({ scores: [h.strokes, h.par], duration: 0 })),
      currentPeriod: 1, winner: null,
      golfData: { holes: [...holes], totalStrokes, totalPar, diff },
    });
  };

  const handleEndEarly = () => {
    Alert.alert('🏁 จบก่อนครบ', 'จบรอบกอล์ฟตอนนี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'จบและบันทึก', style: 'destructive', onPress: () => { setPhase('done'); setIsTimerRunning(false); } },
    ]);
  };

  // Score label helper
  const getScoreLabel = (strokes, par) => {
    if (par <= 0 || strokes <= 0) return '';
    const diff = strokes - par;
    if (diff <= -3) return 'Albatross';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  };

  const getScoreColor = (strokes, par) => {
    if (par <= 0 || strokes <= 0) return COLORS.textMuted;
    const diff = strokes - par;
    if (diff < 0) return '#30D158';
    if (diff === 0) return COLORS.text;
    return '#FF453A';
  };

  // Short label for mini scorecard
  const getShortLabel = (strokes, par) => {
    if (par <= 0 || strokes <= 0) return '-';
    const diff = strokes - par;
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const completedHoles = holes.filter((h) => h.par > 0);
  const totalStrokes = completedHoles.reduce((s, h) => s + h.strokes, 0);
  const totalPar = completedHoles.reduce((s, h) => s + h.par, 0);
  const overallDiff = totalStrokes - totalPar;

  // ---- Shared: Mini Scorecard (shows completed holes) ----
  const renderMiniScorecard = () => {
    if (completedHoles.length === 0) return null;
    return (
      <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 10 }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <Text style={{ width: 30, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600' }}>H</Text>
          {completedHoles.map((h, idx) => (
            <Text key={idx} style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', textAlign: 'center' }}>{h.holeNumber}</Text>
          ))}
          <Text style={{ width: 36, color: '#FFD700', fontSize: 9, fontWeight: '700', textAlign: 'center' }}>Tot</Text>
        </View>
        {/* PAR row */}
        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={{ width: 30, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' }}>PAR</Text>
          {completedHoles.map((h, idx) => (
            <Text key={idx} style={{ flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center' }}>{h.par}</Text>
          ))}
          <Text style={{ width: 36, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{totalPar}</Text>
        </View>
        {/* Score row */}
        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={{ width: 30, color: '#fff', fontSize: 10, fontWeight: '700' }}>SC</Text>
          {completedHoles.map((h, idx) => (
            <Text key={idx} style={{ flex: 1, color: getScoreColor(h.strokes, h.par), fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{h.strokes}</Text>
          ))}
          <Text style={{ width: 36, color: '#FFD700', fontSize: 12, fontWeight: '900', textAlign: 'center' }}>{totalStrokes}</Text>
        </View>
        {/* +/- row */}
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ width: 30, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600' }}>+/-</Text>
          {completedHoles.map((h, idx) => (
            <Text key={idx} style={{ flex: 1, color: getScoreColor(h.strokes, h.par), fontSize: 9, fontWeight: '700', textAlign: 'center' }}>{getShortLabel(h.strokes, h.par)}</Text>
          ))}
          <Text style={{ width: 36, color: overallDiff < 0 ? '#30D158' : overallDiff === 0 ? '#FFD700' : '#FF453A', fontSize: 10, fontWeight: '800', textAlign: 'center' }}>
            {overallDiff >= 0 ? '+' : ''}{overallDiff}
          </Text>
        </View>
      </View>
    );
  };

  // ---- Shared: Undo button ----
  const renderUndoButton = () => (
    <TouchableOpacity
      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: undoStack.length > 0 ? 'rgba(100,210,255,0.2)' : 'transparent', opacity: undoStack.length > 0 ? 1 : 0.3 }}
      onPress={handleUndo}
      disabled={undoStack.length === 0}
    >
      <Text style={{ color: '#64D2FF', fontSize: 12, fontWeight: '600' }}>↩ Undo</Text>
    </TouchableOpacity>
  );

  // ============ ASK PAR PHASE ============
  if (phase === 'askPar') {
    return (
      <View style={{ flex: 1, backgroundColor: '#1B5E20' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#fff', fontSize: 12, opacity: 0.6 }}>⛳ Golf</Text>
            {renderUndoButton()}
          </View>
          <Text style={{ color: '#fff', fontSize: 12, opacity: 0.6 }}>⏱ {formatTime(totalElapsed)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {completedHoles.length > 0 && (
              <TouchableOpacity onPress={() => setShowScorecard((p) => !p)}>
                <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600' }}>{showScorecard ? '✕ ซ่อน' : '📊 Score'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleEndEarly}>
              <Text style={{ color: '#FF6B6B', fontSize: 12, fontWeight: '600' }}>🏁 จบ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mini scorecard */}
        {showScorecard && renderMiniScorecard()}

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' }}>หลุมที่ {currentHoleIdx + 1} / {totalHoles}</Text>
          <Text style={{ color: '#fff', fontSize: 48, fontWeight: '900', marginTop: 8 }}>Hole {currentHole.holeNumber}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, marginTop: 16, marginBottom: 20 }}>หลุมนี้ PAR เท่าไหร่?</Text>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            {[3, 4, 5].map((p) => (
              <TouchableOpacity
                key={p}
                style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}
                onPress={() => selectPar(p)}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom PAR */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' }}>
            {[2, 6].map((p) => (
              <TouchableOpacity
                key={p}
                style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                onPress={() => selectPar(p)}
                activeOpacity={0.7}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20, fontWeight: '700' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Running total */}
          {completedHoles.length > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 20 }}>
              รวม: {totalStrokes} สโตรก / PAR {totalPar} ({overallDiff >= 0 ? '+' : ''}{overallDiff})
            </Text>
          )}
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, marginBottom: 12, borderRadius: 2 }}>
          <View style={{ height: 4, backgroundColor: '#FFD700', borderRadius: 2, width: `${(currentHoleIdx / totalHoles) * 100}%` }} />
        </View>
      </View>
    );
  }

  // ============ PLAYING PHASE ============
  if (phase === 'playing') {
    const label = getScoreLabel(currentHole.strokes, currentHole.par);
    const scoreColor = getScoreColor(currentHole.strokes, currentHole.par);
    return (
      <View style={{ flex: 1, backgroundColor: '#1B5E20' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#fff', fontSize: 12, opacity: 0.6 }}>⛳ Hole {currentHole.holeNumber} • PAR {currentHole.par}</Text>
            {renderUndoButton()}
          </View>
          <Text style={{ color: '#fff', fontSize: 12, opacity: 0.6 }}>⏱ {formatTime(totalElapsed)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {completedHoles.length > 0 && (
              <TouchableOpacity onPress={() => setShowScorecard((p) => !p)}>
                <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600' }}>{showScorecard ? '✕ ซ่อน' : '📊 Score'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleEndEarly}>
              <Text style={{ color: '#FF6B6B', fontSize: 12, fontWeight: '600' }}>🏁 จบ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mini scorecard */}
        {showScorecard && renderMiniScorecard()}

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' }}>หลุมที่ {currentHoleIdx + 1} / {totalHoles}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 4 }}>PAR {currentHole.par}</Text>

          {/* Stroke counter */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 20 }}>
            <TouchableOpacity
              style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,69,58,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,69,58,0.5)' }}
              onPress={() => addStroke(-1)}
              disabled={currentHole.strokes <= 1}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FF453A', fontSize: 30, fontWeight: '900' }}>-</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>STROKES</Text>
              <Text style={{ color: '#fff', fontSize: 72, fontWeight: '900', lineHeight: 80 }}>{currentHole.strokes}</Text>
              <Text style={{ color: scoreColor, fontSize: 16, fontWeight: '700', marginTop: 4 }}>{label}</Text>
            </View>

            <TouchableOpacity
              style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(48,209,88,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(48,209,88,0.5)' }}
              onPress={() => addStroke(1)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#30D158', fontSize: 30, fontWeight: '900' }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={{ marginTop: 30, backgroundColor: '#FFD700', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 }}
            onPress={confirmHole}
            activeOpacity={0.75}
          >
            <Text style={{ color: '#1B5E20', fontSize: 18, fontWeight: '800' }}>
              {currentHoleIdx < totalHoles - 1 ? '✔ หลุมถัดไป' : '✔ จบรอบ'}
            </Text>
          </TouchableOpacity>

          {/* Running total */}
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 16 }}>
            รวม: {totalStrokes} สโตรก / PAR {totalPar} ({overallDiff >= 0 ? '+' : ''}{overallDiff})
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, marginBottom: 12, borderRadius: 2 }}>
          <View style={{ height: 4, backgroundColor: '#FFD700', borderRadius: 2, width: `${((currentHoleIdx + 1) / totalHoles) * 100}%` }} />
        </View>
      </View>
    );
  }

  // ============ DONE PHASE ============
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800' }}>⛳ Scorecard</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>⏱ {formatTime(totalElapsed)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Summary card */}
        <View style={{ backgroundColor: '#1B5E20', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>ผลรวม</Text>
          <Text style={{ color: '#fff', fontSize: 56, fontWeight: '900', marginTop: 4 }}>{totalStrokes}</Text>
          <Text style={{ color: overallDiff < 0 ? '#30D158' : overallDiff === 0 ? '#FFD700' : '#FF453A', fontSize: 20, fontWeight: '800', marginTop: 4 }}>
            {overallDiff >= 0 ? '+' : ''}{overallDiff} ({totalPar} PAR)
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>{completedHoles.length} หลุม • {formatTime(totalElapsed)}</Text>
        </View>

        {/* Scorecard table */}
        <View style={{ backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
          {/* Table header */}
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.cardHighlight, paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' }}>หลุม</Text>
            <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>PAR</Text>
            <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>Score</Text>
            <Text style={{ flex: 1.5, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'right' }}>ผล</Text>
          </View>

          {/* Rows */}
          {holes.map((h, idx) => {
            if (h.par <= 0) return null;
            const diff = h.strokes - h.par;
            const label = getScoreLabel(h.strokes, h.par);
            const color = getScoreColor(h.strokes, h.par);
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '700' }}>{h.holeNumber}</Text>
                <Text style={{ flex: 1, color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>{h.par}</Text>
                <Text style={{ flex: 1, color, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>{h.strokes}</Text>
                <Text style={{ flex: 1.5, color, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{label}</Text>
              </View>
            );
          })}

          {/* Total row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.cardHighlight }}>
            <Text style={{ flex: 1, color: COLORS.warning, fontSize: 13, fontWeight: '700' }}>รวม</Text>
            <Text style={{ flex: 1, color: COLORS.warning, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{totalPar}</Text>
            <Text style={{ flex: 1, color: COLORS.warning, fontSize: 16, fontWeight: '900', textAlign: 'center' }}>{totalStrokes}</Text>
            <Text style={{ flex: 1.5, color: overallDiff < 0 ? '#30D158' : overallDiff === 0 ? '#FFD700' : '#FF453A', fontSize: 13, fontWeight: '700', textAlign: 'right' }}>{overallDiff >= 0 ? '+' : ''}{overallDiff}</Text>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={{ backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 }}
          onPress={handleFinish}
          activeOpacity={0.75}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>💾 บันทึกผล</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
