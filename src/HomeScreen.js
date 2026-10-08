import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Switch,
  useWindowDimensions,
} from 'react-native';
import { COLORS, SPORTS_CONFIG, SPORT_KEYS, MODE_INFO, SET_OPTIONS, COLOR_OPTIONS, SCORE_PRESETS, EMOJI_OPTIONS } from './constants';
import { loadCustomSports, saveCustomSports } from './helpers';
import { styles } from './styles';

function renderProRulesInfo(sport, sportConf) {
  // Built-in sport rules
  const lines = [];
  if (sport === 'badminton') {
    lines.push('• Best of 3 เซ็ต, 21 แต้มชนะ');
    lines.push('• Deuce ที่ 20-20 (นำ 2, สูงสุด 30)');
    lines.push('• สลับฝั่งทุกเซ็ต');
  } else if (sport === 'basketball') {
    lines.push('• 4 ควอเตอร์ × 10 นาที (FIBA)');
    lines.push('• Countdown Timer, OT 5 นาที');
    lines.push('• ปุ่ม +1 / +2 / +3');
  } else if (sport === 'volleyball') {
    lines.push('• Best of 5 เซ็ต');
    lines.push('• เซ็ต 1-4: 25 แต้ม, เซ็ต 5: 15 แต้ม');
    lines.push('• Deuce (นำ 2 แต้ม)');
  } else if (sport === 'football') {
    lines.push('• 2 ครึ่ง × 45 นาที');
    lines.push('• Stopwatch Timer');
  } else if (sport === 'tableTennis') {
    lines.push('• Best of 5 เซ็ต, 11 แต้มชนะ');
    lines.push('• Deuce ที่ 10-10 (นำ 2)');
  } else if (sport === 'chess') {
    lines.push('• จับเวลาหมากรุก 10 นาที/ฝั่ง');
    lines.push('• กดฝั่งตัวเองเมื่อเดินเสร็จ');
    lines.push('• หมดเวลา = แพ้');
    lines.push('• รองรับ Increment');
  } else if (sport === 'golf') {
    lines.push('• เล่นคนเดียว นับสโตรกรายหลุม');
    lines.push('• กำหนด PAR แต่ละหลุม');
    lines.push('• Scorecard สรุปผลเทียบ PAR');
  } else if (sportConf && sportConf.isUserSport) {
    // User-created sport: show saved rules
    const r = sportConf.proRules;
    if (r.timerType === 'countdown') {
      lines.push(`• ${r.periods} ช่วง × ${Math.round(r.periodTime / 60)} นาที`);
      lines.push('• Countdown Timer, OT 5 นาที');
    } else {
      lines.push(`• Best of ${r.bestOf} เซ็ต, ${r.pointsToWin} แต้มชนะ`);
      if (r.deuceAt !== Infinity) lines.push(`• Deuce ที่ ${r.deuceAt}-${r.deuceAt}`);
      if (r.maxPoints) lines.push(`• แต้มสูงสุด ${r.maxPoints}`);
    }
    lines.push(`• ปุ่ม ${sportConf.scoreButtons.map((b) => '+' + b).join(' / ')}`);
  }
  return lines.map((l, i) => <Text key={i} style={styles.ruleText}>{l}</Text>);
}

export function HomeScreen({ onStartGame, onViewHistory }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [customSettings, setCustomSettings] = useState({ pointsToWin: 21, totalSets: 3, deuceEnabled: true, scoreButtons: null });
  const [pointsText, setPointsText] = useState('21');
  const [customScoreText, setCustomScoreText] = useState('');
  const [sportSearch, setSportSearch] = useState('');

  // ---- Custom Sports ----
  const [userSports, setUserSports] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSport, setNewSport] = useState({
    name: '', emoji: '🏅', color: COLOR_OPTIONS[0],
    scoreButtons: [1], scoreLabels: [], pointsToWin: 21, bestOf: 3,
    deuceEnabled: true, maxPoints: 0,
    timerType: 'stopwatch', periodTime: 10, periods: 4,
  });
  const [newNameError, setNewNameError] = useState(false);
  const [newScoreInput, setNewScoreInput] = useState('');
  const [newScoreLabelInput, setNewScoreLabelInput] = useState('');

  useEffect(() => {
    loadCustomSports().then((list) => setUserSports(list));
  }, []);

  // Merge built-in + user sports into a lookup
  const allSportsConfig = React.useMemo(() => {
    const merged = { ...SPORTS_CONFIG };
    userSports.forEach((s) => { merged[s.key] = s.config; });
    return merged;
  }, [userSports]);

  const allSportKeys = React.useMemo(() => {
    return [...SPORT_KEYS, ...userSports.map((s) => s.key)];
  }, [userSports]);

  // Filtered sport keys by search
  const filteredSportKeys = React.useMemo(() => {
    if (!sportSearch.trim()) return allSportKeys;
    const q = sportSearch.trim().toLowerCase();
    return allSportKeys.filter((key) => {
      const s = allSportsConfig[key];
      if (!s) return false;
      return s.name.toLowerCase().includes(q) || (s.nameLocal || '').toLowerCase().includes(q) || (s.emoji || '').includes(q);
    });
  }, [allSportKeys, allSportsConfig, sportSearch]);

  const handleSelectSport = (sport) => {
    setSelectedSport(sport);
    const sportConf = allSportsConfig[sport];
    const defaults = sportConf.customDefaults;
    // Golf has only 1 mode, auto-select
    if (sportConf.type === 'golf') {
      setSelectedMode('golf');
      setCustomSettings({ ...defaults });
    } else {
      setSelectedMode(null);
      setCustomSettings({ ...defaults, scoreButtons: sportConf.scoreButtons || [1] });
    }
    setPointsText(String(defaults.pointsToWin));
    setCustomScoreText('');
  };

  const handleStart = () => {
    if (!selectedSport || !selectedMode) return;
    const pts = parseInt(pointsText, 10);
    const finalSettings = { ...customSettings, pointsToWin: isNaN(pts) || pts < 1 ? 21 : pts };
    // If custom mode with custom score buttons, pass them along
    if (selectedMode === 'custom' && finalSettings.scoreButtons) {
      // scoreButtons is already in customSettings
    }
    onStartGame({
      sport: selectedSport,
      mode: selectedMode,
      customSettings: finalSettings,
      allSportsConfig,
    });
  };

  // ---- Save new custom sport ----
  const handleSaveNewSport = async () => {
    if (!newSport.name.trim()) { setNewNameError(true); return; }
    setNewNameError(false);
    const key = 'user_' + Date.now();
    const isCountdown = newSport.timerType === 'countdown';
    const sportType = isCountdown ? 'periodBased' : 'setBased';
    const deuceAt = Math.max(0, newSport.pointsToWin - 1);

    // Build scoreLabels if provided
    const hasLabels = newSport.scoreLabels && newSport.scoreLabels.length > 0 && newSport.scoreLabels.some(l => l.trim() !== '');
    const config = {
      name: newSport.name.trim(),
      nameLocal: '',
      emoji: newSport.emoji || '🏅',
      color: newSport.color,
      scoreButtons: newSport.scoreButtons,
      ...(hasLabels ? { scoreLabels: newSport.scoreLabels } : {}),
      type: sportType,
      isUserSport: true,
      proRules: isCountdown
        ? {
          periods: newSport.periods || 4,
          periodName: 'Period',
          periodNameLocal: 'ช่วง',
          periodTime: (newSport.periodTime || 10) * 60,
          overtimeTime: 300,
          timerType: 'countdown',
        }
        : {
          bestOf: newSport.bestOf,
          pointsToWin: newSport.pointsToWin,
          deuceAt: newSport.deuceEnabled ? deuceAt : Infinity,
          maxPoints: newSport.maxPoints > 0 ? newSport.maxPoints : null,
          timerType: 'stopwatch',
        },
      customDefaults: {
        pointsToWin: newSport.pointsToWin,
        totalSets: newSport.bestOf,
        deuceEnabled: newSport.deuceEnabled,
      },
    };

    const updated = [...userSports, { key, config }];
    setUserSports(updated);
    await saveCustomSports(updated);
    setShowCreateForm(false);
    setNewSport({ name: '', emoji: '🏅', color: COLOR_OPTIONS[0], scoreButtons: [1], scoreLabels: [], pointsToWin: 21, bestOf: 3, deuceEnabled: true, maxPoints: 0, timerType: 'stopwatch', periodTime: 10, periods: 4 });
    setNewScoreInput('');
    setNewScoreLabelInput('');
    Alert.alert('✅ บันทึกแล้ว', `"${config.name}" ถูกเพิ่มแล้ว`);
  };

  const handleDeleteSport = (key, name) => {
    Alert.alert('🗑 ลบกีฬา', `ลบ "${name}" ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          const updated = userSports.filter((s) => s.key !== key);
          setUserSports(updated);
          await saveCustomSports(updated);
          if (selectedSport === key) { setSelectedSport(null); setSelectedMode(null); }
        },
      },
    ]);
  };

  const canStart = selectedSport && selectedMode;
  const isGolfSport = selectedSport && allSportsConfig[selectedSport]?.type === 'golf';

  // ---- Shared: Sport Card renderer ----
  const renderSportCard = (key, compact) => {
    const sport = allSportsConfig[key];
    if (!sport) return null;
    const isSelected = selectedSport === key;
    const isUser = sport.isUserSport;
    const cardW = compact ? (width / 2 - 44) / 3 : (width - 60) / 2;
    return (
      <View key={key} style={{ position: 'relative' }}>
        <TouchableOpacity
          style={[
            styles.sportCard,
            { width: cardW, paddingVertical: compact ? 10 : 18, backgroundColor: isSelected ? sport.color + '18' : COLORS.card },
            { borderColor: isSelected ? sport.color : COLORS.border, borderWidth: isSelected ? 2 : 1 },
          ]}
          onPress={() => handleSelectSport(key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sportEmoji, compact && { fontSize: 24 }]}>{sport.emoji}</Text>
          <Text style={[styles.sportName, compact && { fontSize: 11 }, isSelected && { color: sport.color }]}>{sport.name}</Text>
          {!compact && sport.nameLocal ? <Text style={styles.sportNameLocal}>{sport.nameLocal}</Text> : null}
        </TouchableOpacity>
        {isUser && (
          <TouchableOpacity
            style={{ position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.danger, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
            onPress={() => handleDeleteSport(key, sport.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 14 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ---- Shared: Create Sport Form ----
  const renderCreateForm = (compact) => (
    <View style={[styles.customPanel, compact ? { marginHorizontal: 0, marginTop: 8 } : { marginHorizontal: 16, marginTop: 14 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={[styles.customTitle, { marginBottom: 0, fontSize: compact ? 14 : 16 }]}>➕  สร้างกีฬาใหม่</Text>
        <TouchableOpacity onPress={() => setShowCreateForm(false)}>
          <Text style={{ color: COLORS.textMuted, fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Name */}
      <View style={styles.customRow}>
        <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>ชื่อกีฬา *</Text>
        <TextInput
          style={[styles.customInput, { width: 140, fontSize: compact ? 13 : 15 }, newNameError && { borderColor: COLORS.danger }]}
          value={newSport.name}
          onChangeText={(t) => { setNewSport((p) => ({ ...p, name: t })); setNewNameError(false); }}
          placeholder="เช่น Sepak Takraw"
          placeholderTextColor={COLORS.textMuted}
          maxLength={20}
        />
      </View>

      {/* Emoji */}
      <View style={styles.customRow}>
        <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>Emoji</Text>
        <TextInput
          style={[styles.customInput, { width: 56, fontSize: 22 }]}
          value={newSport.emoji}
          onChangeText={(t) => setNewSport((p) => ({ ...p, emoji: t.slice(-2) }))}
          maxLength={2}
        />
      </View>

      {/* Emoji quick picks */}
      <View style={[styles.customRow, { flexWrap: 'wrap', marginTop: -6 }]}>
        <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>เลือก Emoji</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 2 }}>
          {EMOJI_OPTIONS.map((e) => (
            <TouchableOpacity
              key={e}
              style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: newSport.emoji === e ? COLORS.warning + '30' : COLORS.cardHighlight, justifyContent: 'center', alignItems: 'center', borderWidth: newSport.emoji === e ? 1 : 0, borderColor: COLORS.warning }}
              onPress={() => setNewSport((p) => ({ ...p, emoji: e }))}
            >
              <Text style={{ fontSize: 18 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color */}
      <View style={[styles.customRow, { flexWrap: 'wrap' }]}>
        <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>สี</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: newSport.color === c ? 3 : 0, borderColor: '#fff' }}
              onPress={() => setNewSport((p) => ({ ...p, color: c }))}
            />
          ))}
        </View>
      </View>

      {/* Score buttons - custom */}
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.customLabel, compact && { fontSize: 12 }, { marginBottom: 8 }]}>ปุ่มให้คะแนน (กำหนดได้เอง)</Text>

        {/* Quick presets */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {SCORE_PRESETS.map((preset) => {
            const active = JSON.stringify(newSport.scoreButtons) === JSON.stringify(preset.value);
            return (
              <TouchableOpacity
                key={preset.label}
                style={[styles.setOption, active && styles.setOptionActive, { width: 'auto', paddingHorizontal: 10, height: 34 }]}
                onPress={() => setNewSport((p) => ({ ...p, scoreButtons: preset.value, scoreLabels: [] }))}
              >
                <Text style={[styles.setOptionText, active && styles.setOptionTextActive, { fontSize: 12 }]}>{preset.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Current buttons display */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {newSport.scoreButtons.map((pts, idx) => (
            <View key={`sb-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardHighlight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.warning + '40' }}>
              <Text style={{ color: pts < 0 ? COLORS.danger : COLORS.warning, fontWeight: '800', fontSize: 14 }}>{pts > 0 ? '+' : ''}{pts}</Text>
              {newSport.scoreLabels && newSport.scoreLabels[idx] ? (
                <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginLeft: 4 }}>({newSport.scoreLabels[idx]})</Text>
              ) : null}
              <TouchableOpacity
                style={{ marginLeft: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.danger + '40', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                  if (newSport.scoreButtons.length <= 1) return; // keep at least 1
                  setNewSport((p) => ({
                    ...p,
                    scoreButtons: p.scoreButtons.filter((_, i) => i !== idx),
                    scoreLabels: (p.scoreLabels || []).filter((_, i) => i !== idx),
                  }));
                }}
              >
                <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '800', lineHeight: 14 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Add new score button */}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TextInput
            style={[styles.customInput, { width: 70, fontSize: 14, paddingVertical: 6 }]}
            value={newScoreInput}
            onChangeText={setNewScoreInput}
            placeholder="เช่น 1, -1"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="default"
            maxLength={4}
          />
          <TextInput
            style={[styles.customInput, { width: 80, fontSize: 13, paddingVertical: 6 }]}
            value={newScoreLabelInput}
            onChangeText={setNewScoreLabelInput}
            placeholder="ชื่อ (ไม่จำเป็น)"
            placeholderTextColor={COLORS.textMuted}
            maxLength={10}
          />
          <TouchableOpacity
            style={{ backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            onPress={() => {
              const val = parseInt(newScoreInput, 10);
              if (isNaN(val) || val === 0 || val < -999 || val > 999) {
                Alert.alert('⚠️', 'กรุณาใส่จำนวนแต้ม (-999 ถึง 999 ไม่รวม 0)');
                return;
              }
              setNewSport((p) => ({
                ...p,
                scoreButtons: [...p.scoreButtons, val],
                scoreLabels: [...(p.scoreLabels || []), newScoreLabelInput.trim()],
              }));
              setNewScoreInput('');
              setNewScoreLabelInput('');
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ เพิ่ม</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer type */}
      <View style={styles.customRow}>
        <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>ตัวจับเวลา</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[{ k: 'stopwatch', l: '⏱ นับขึ้น' }, { k: 'countdown', l: '⏳ นับถอยหลัง' }].map(({ k, l }) => {
            const active = newSport.timerType === k;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.setOption, active && styles.setOptionActive, { width: 'auto', paddingHorizontal: 10, height: 34 }]}
                onPress={() => setNewSport((p) => ({ ...p, timerType: k }))}
              >
                <Text style={[styles.setOptionText, active && styles.setOptionTextActive, { fontSize: 11 }]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Countdown fields */}
      {newSport.timerType === 'countdown' && (
        <>
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>จำนวนช่วง (Periods)</Text>
            <TextInput
              style={[styles.customInput, { width: 64, fontSize: 15 }]}
              value={String(newSport.periods)}
              onChangeText={(t) => setNewSport((p) => ({ ...p, periods: parseInt(t, 10) || 1 }))}
              keyboardType="number-pad" maxLength={2}
            />
          </View>
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>เวลาต่อช่วง (นาที)</Text>
            <TextInput
              style={[styles.customInput, { width: 64, fontSize: 15 }]}
              value={String(newSport.periodTime)}
              onChangeText={(t) => setNewSport((p) => ({ ...p, periodTime: parseInt(t, 10) || 1 }))}
              keyboardType="number-pad" maxLength={3}
            />
          </View>
        </>
      )}

      {/* Set-based fields */}
      {newSport.timerType === 'stopwatch' && (
        <>
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>แต้มที่ชนะต่อเซ็ต</Text>
            <TextInput
              style={[styles.customInput, { width: 64, fontSize: 15 }]}
              value={String(newSport.pointsToWin)}
              onChangeText={(t) => setNewSport((p) => ({ ...p, pointsToWin: parseInt(t, 10) || 1 }))}
              keyboardType="number-pad" maxLength={4}
            />
          </View>
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>จำนวนเซ็ต (Best of)</Text>
            <View style={styles.setSelector}>
              {SET_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.setOption, newSport.bestOf === n && styles.setOptionActive, compact && { width: 34, height: 34 }]}
                  onPress={() => setNewSport((p) => ({ ...p, bestOf: n }))}
                >
                  <Text style={[styles.setOptionText, newSport.bestOf === n && styles.setOptionTextActive, compact && { fontSize: 13 }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>เปิด Deuce</Text>
            <Switch
              value={newSport.deuceEnabled}
              onValueChange={(v) => setNewSport((p) => ({ ...p, deuceEnabled: v }))}
              trackColor={{ false: COLORS.textMuted, true: COLORS.accent + '60' }}
              thumbColor={newSport.deuceEnabled ? COLORS.accent : '#ccc'}
            />
          </View>
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>แต้มสูงสุด (0=ไม่จำกัด)</Text>
            <TextInput
              style={[styles.customInput, { width: 64, fontSize: 15 }]}
              value={String(newSport.maxPoints)}
              onChangeText={(t) => setNewSport((p) => ({ ...p, maxPoints: parseInt(t, 10) || 0 }))}
              keyboardType="number-pad" maxLength={4}
            />
          </View>
        </>
      )}

      {/* Save button */}
      <TouchableOpacity style={[styles.startButton, { marginHorizontal: 0, marginTop: 8, paddingVertical: 12 }]} onPress={handleSaveNewSport} activeOpacity={0.75}>
        <Text style={[styles.startButtonText, { fontSize: 16 }]}>💾  บันทึกกีฬา</Text>
      </TouchableOpacity>
    </View>
  );

  // ---- Shared: Golf settings ----
  const renderGolfSettings = (compact) => {
    if (!isGolfSport) return null;
    return (
      <View style={[styles.customPanel, compact ? { marginHorizontal: 0, marginTop: 10 } : {}]}>
        <Text style={[styles.customTitle, compact && { fontSize: 13 }]}>⛳ ตั้งค่ากอล์ฟ</Text>

        {/* Number of holes */}
        <Text style={[styles.customLabel, compact && { fontSize: 12 }, { marginBottom: 8 }]}>จำนวนหลุม</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {[9, 18].map((n) => {
            const active = customSettings.totalHoles === n;
            return (
              <TouchableOpacity key={n} style={[styles.setOption, active && styles.setOptionActive, { width: 70, height: 40 }]} onPress={() => setCustomSettings((p) => ({ ...p, totalHoles: n }))}>
                <Text style={[styles.setOptionText, active && styles.setOptionTextActive, { fontSize: 16 }]}>{n} หลุม</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>หรือ</Text>
            <TextInput style={[styles.customInput, { width: 50, fontSize: 14, paddingVertical: 6 }]} value={String(customSettings.totalHoles || 9)} onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n > 0 && n <= 99) setCustomSettings((p) => ({ ...p, totalHoles: n })); }} keyboardType="number-pad" maxLength={2} selectTextOnFocus placeholderTextColor={COLORS.textMuted} />
          </View>
        </View>

        {/* Starting hole */}
        <View style={styles.customRow}>
          <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>เริ่มที่หลุม</Text>
          <TextInput style={[styles.customInput, compact && { width: 50, fontSize: 15 }]} value={String(customSettings.startingHole || 1)} onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n > 0) setCustomSettings((p) => ({ ...p, startingHole: n })); }} keyboardType="number-pad" maxLength={2} selectTextOnFocus placeholderTextColor={COLORS.textMuted} />
        </View>
      </View>
    );
  };

  // ---- Shared: Mode + game settings panel ----
  const renderModeAndSettings = (compact) => {
    if (!selectedSport) return null;
    const sportConf = allSportsConfig[selectedSport];

    // Golf: show golf settings only (no mode selection)
    if (sportConf.type === 'golf') {
      return renderGolfSettings(compact);
    }

    return (
      <>
        <Text style={[styles.sectionTitle, compact ? { marginLeft: 0, fontSize: 14, marginTop: 4 } : {}]}>เลือกโหมด</Text>
        <View style={compact ? { flexDirection: 'row', gap: 8 } : styles.modeRow}>
          {['pro', 'casual', 'custom'].map((key) => {
            const mode = MODE_INFO[key];
            const isSelected = selectedMode === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.modeCard,
                  { backgroundColor: isSelected ? mode.color + '18' : COLORS.card },
                  { borderColor: isSelected ? mode.color : COLORS.border, borderWidth: isSelected ? 2 : 1 },
                  compact && { paddingVertical: 10 },
                ]}
                onPress={() => setSelectedMode(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeEmoji, compact && { fontSize: 20 }]}>{mode.emoji}</Text>
                <Text style={[styles.modeLabel, compact && { fontSize: 13 }, isSelected && { color: mode.color }]}>{mode.label}</Text>
                <Text style={[styles.modeDesc, compact && { fontSize: 10 }]}>{mode.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMode === 'custom' && (
          <View style={[styles.customPanel, compact ? { marginHorizontal: 0, marginTop: 10 } : {}]}>
            <Text style={[styles.customTitle, compact && { fontSize: 13 }]}>⚙️  ตั้งค่าเอง</Text>
            {allSportsConfig[selectedSport]?.type === 'chessClock' ? (
              <>
                <Text style={[styles.customLabel, compact && { fontSize: 12 }, { marginBottom: 8 }]}>⏱ เวลาต่อฝั่ง</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[{ label: '1 นาที', min: 1 }, { label: '3 นาที', min: 3 }, { label: '5 นาที', min: 5 }, { label: '10 นาที', min: 10 }, { label: '15 นาที', min: 15 }, { label: '30 นาที', min: 30 }, { label: '60 นาที', min: 60 }].map((preset) => {
                    const active = customSettings.timePerPlayer === preset.min;
                    return (
                      <TouchableOpacity key={preset.min} style={[styles.setOption, active && styles.setOptionActive, { width: 'auto', paddingHorizontal: 12, height: 34 }]} onPress={() => setCustomSettings((p) => ({ ...p, timePerPlayer: preset.min }))}>
                        <Text style={[styles.setOptionText, active && styles.setOptionTextActive, { fontSize: 12 }]}>{preset.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.customRow}>
                  <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>เวลา (นาที)</Text>
                  <TextInput style={[styles.customInput, compact && { width: 64, fontSize: 15 }]} value={String(customSettings.timePerPlayer || 10)} onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n > 0) setCustomSettings((p) => ({ ...p, timePerPlayer: n })); }} keyboardType="number-pad" maxLength={3} selectTextOnFocus placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={styles.customRow}>
                  <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>Increment (+วินาทีต่อเดิน)</Text>
                  <TextInput style={[styles.customInput, compact && { width: 64, fontSize: 15 }]} value={String(customSettings.increment || 0)} onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 0) setCustomSettings((p) => ({ ...p, increment: n })); }} keyboardType="number-pad" maxLength={3} selectTextOnFocus placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {[0, 1, 2, 3, 5, 10].map((inc) => {
                    const active = (customSettings.increment || 0) === inc;
                    return (
                      <TouchableOpacity key={inc} style={[styles.setOption, active && styles.setOptionActive, { width: 'auto', paddingHorizontal: 10, height: 30 }]} onPress={() => setCustomSettings((p) => ({ ...p, increment: inc }))}>
                        <Text style={[styles.setOptionText, active && styles.setOptionTextActive, { fontSize: 11 }]}>+{inc}s</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
            <View style={styles.customRow}>
              <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>แต้มที่ชนะ</Text>
              <TextInput
                style={[styles.customInput, compact && { width: 64, fontSize: 15 }]}
                value={pointsText} onChangeText={setPointsText}
                keyboardType="number-pad" maxLength={4} selectTextOnFocus
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.customRow}>
              <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>จำนวนเซ็ต (Best of)</Text>
              <View style={styles.setSelector}>
                {SET_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.setOption, customSettings.totalSets === n && styles.setOptionActive, compact && { width: 34, height: 34 }]}
                    onPress={() => setCustomSettings((p) => ({ ...p, totalSets: n }))}
                  >
                    <Text style={[styles.setOptionText, customSettings.totalSets === n && styles.setOptionTextActive, compact && { fontSize: 13 }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.customRow}>
              <Text style={[styles.customLabel, compact && { fontSize: 12 }]}>เปิด Deuce</Text>
              <Switch
                value={customSettings.deuceEnabled}
                onValueChange={(v) => setCustomSettings((p) => ({ ...p, deuceEnabled: v }))}
                trackColor={{ false: COLORS.textMuted, true: COLORS.accent + '60' }}
                thumbColor={customSettings.deuceEnabled ? COLORS.accent : '#ccc'}
              />
            </View>

            {/* Custom score buttons */}
            <View style={{ marginTop: 4 }}>
              <Text style={[styles.customLabel, compact && { fontSize: 12 }, { marginBottom: 8 }]}>ปุ่มเพิ่มแต้ม (กำหนดเอง)</Text>

              {/* Current buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {(customSettings.scoreButtons || [1]).map((pts, idx) => (
                  <View key={`csb-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardHighlight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.accent + '40' }}>
                    <Text style={{ color: pts < 0 ? COLORS.danger : COLORS.accent, fontWeight: '800', fontSize: 14 }}>{pts > 0 ? '+' : ''}{pts}</Text>
                    <TouchableOpacity
                      style={{ marginLeft: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.danger + '40', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => {
                        if ((customSettings.scoreButtons || [1]).length <= 1) return;
                        setCustomSettings((p) => ({
                          ...p,
                          scoreButtons: (p.scoreButtons || [1]).filter((_, i) => i !== idx),
                        }));
                      }}
                    >
                      <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '800', lineHeight: 14 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Add new */}
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput
                  style={[styles.customInput, { width: 80, fontSize: 14, paddingVertical: 6 }]}
                  value={customScoreText}
                  onChangeText={setCustomScoreText}
                  placeholder="เช่น 1, -1"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="default"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                  onPress={() => {
                    const val = parseInt(customScoreText, 10);
                    if (isNaN(val) || val === 0 || val < -999 || val > 999) {
                      Alert.alert('⚠️', 'กรุณาใส่จำนวนแต้ม (-999 ถึง 999 ไม่รวม 0)');
                      return;
                    }
                    setCustomSettings((p) => ({
                      ...p,
                      scoreButtons: [...(p.scoreButtons || [1]), val],
                    }));
                    setCustomScoreText('');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ เพิ่ม</Text>
                </TouchableOpacity>
              </View>
            </View>
              </>
            )}
          </View>
        )}

        {selectedMode === 'pro' && (
          <View style={[styles.customPanel, compact ? { marginHorizontal: 0, marginTop: 10 } : {}]}>
            <Text style={[styles.customTitle, compact && { fontSize: 13 }]}>🏆  กฎ Pro Mode</Text>
            {renderProRulesInfo(selectedSport, sportConf)}
          </View>
        )}
      </>
    );
  };

  // ============================================================
  // LANDSCAPE
  // ============================================================
  if (isLandscape) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: COLORS.bg }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 20 }}>
          <View style={[styles.homeHeader, { paddingTop: 6, paddingBottom: 6 }]}>
            <Text style={[styles.homeTitle, { fontSize: 20 }]}>🏆 Sports Scoreboard</Text>
          </View>
          <TouchableOpacity style={[styles.historyButton, { marginBottom: 8, paddingVertical: 7 }]} onPress={onViewHistory} activeOpacity={0.7}>
            <Text style={[styles.historyButtonText, { fontSize: 13 }]}>📋  ประวัติการเล่น</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { marginLeft: 0, fontSize: 14, marginTop: 8 }]}>เลือกกีฬา</Text>
          <View style={{ marginBottom: 8 }}>
            <TextInput
              style={{ backgroundColor: COLORS.cardHighlight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, color: COLORS.text, fontSize: 13, borderWidth: 1, borderColor: COLORS.border }}
              value={sportSearch}
              onChangeText={setSportSearch}
              placeholder="🔍 ค้นหากีฬา..."
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {filteredSportKeys.map((key) => renderSportCard(key, true))}
            {/* Add sport button */}
            <TouchableOpacity
              style={[
                styles.sportCard,
                { width: (width / 2 - 44) / 3, paddingVertical: 10, borderStyle: 'dashed', borderColor: COLORS.textMuted },
                showCreateForm && { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '10' },
              ]}
              onPress={() => setShowCreateForm((p) => !p)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>{showCreateForm ? '✕' : '➕'}</Text>
              <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>เพิ่มกีฬา</Text>
            </TouchableOpacity>
          </View>
          {showCreateForm && renderCreateForm(true)}
          {canStart && (
            <TouchableOpacity style={[styles.startButton, { marginHorizontal: 0, marginTop: 14 }]} onPress={handleStart} activeOpacity={0.75}>
              <Text style={[styles.startButtonText, { fontSize: 17 }]}>🎮  เริ่มเกม!</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <View style={{ width: 1, backgroundColor: COLORS.border }} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 20 }}>
          {selectedSport ? renderModeAndSettings(true) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.3, paddingTop: 60 }}>
              <Text style={{ fontSize: 40 }}>👈</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>เลือกกีฬาก่อน</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ============================================================
  // PORTRAIT
  // ============================================================
  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>🏆 Sports Scoreboard</Text>
        <Text style={styles.homeSubtitle}>เลือกกีฬาและโหมดการเล่น</Text>
      </View>

      <TouchableOpacity style={styles.historyButton} onPress={onViewHistory} activeOpacity={0.7}>
        <Text style={styles.historyButtonText}>📋  ประวัติการเล่น</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>เลือกกีฬา</Text>
      <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
        <TextInput
          style={{ backgroundColor: COLORS.cardHighlight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border }}
          value={sportSearch}
          onChangeText={setSportSearch}
          placeholder="🔍 ค้นหากีฬา..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>
      <View style={styles.sportGrid}>
        {filteredSportKeys.map((key) => renderSportCard(key, false))}
        {/* Add sport button */}
        <TouchableOpacity
          style={[
            styles.sportCard,
            { width: (width - 60) / 2, borderStyle: 'dashed', borderColor: COLORS.textMuted },
            showCreateForm && { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '10' },
          ]}
          onPress={() => setShowCreateForm((p) => !p)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 36 }}>{showCreateForm ? '✕' : '➕'}</Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>เพิ่มกีฬา</Text>
        </TouchableOpacity>
      </View>

      {showCreateForm && renderCreateForm(false)}

      {renderModeAndSettings(false)}

      {canStart && (
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.75}>
          <Text style={styles.startButtonText}>🎮  เริ่มเกม!</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
