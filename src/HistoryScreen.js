import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, FlatList, Alert, TextInput, useWindowDimensions,
} from 'react-native';
import { COLORS, SPORTS_CONFIG, MODE_INFO } from './constants';
import { formatTime, formatDate, loadGameHistory, clearGameHistory, deleteGameHistoryItem } from './helpers';
import { styles } from './styles';

export function HistoryScreen({ onBack }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const numColumns = isLandscape ? 2 : 1;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // detail view
  const [searchQuery, setSearchQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');

  useEffect(() => {
    loadGameHistory().then((data) => { setHistory(data); setLoading(false); });
  }, []);

  const handleClear = () => {
    Alert.alert('🗑 ลบประวัติ', 'ลบประวัติการเล่นทั้งหมด?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบทั้งหมด', style: 'destructive', onPress: async () => { await clearGameHistory(); setHistory([]); } },
    ]);
  };

  const handleDeleteItem = (item) => {
    Alert.alert('🗑 ลบรายการนี้', `ลบผลการแข่ง ${item.sportEmoji} ${item.sportName}?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          const updated = await deleteGameHistoryItem(item.id);
          if (updated !== null) setHistory(updated);
          if (selectedItem && selectedItem.id === item.id) setSelectedItem(null);
        },
      },
    ]);
  };

  const getWinnerText = (item) => {
    if (item.golfData) {
      const d = item.golfData.diff;
      if (d < 0) return `${d} ใต้ PAR 🏆`;
      if (d === 0) return 'Even PAR 🏆';
      return `+${d} เหนือ PAR`;
    }
    if (item.winner === 0) return 'Team A ชนะ 🏆';
    if (item.winner === 1) return 'Team B ชนะ 🏆';
    return 'เสมอ / ไม่มีผู้ชนะ';
  };

  const getScoreDisplay = (item) => {
    if (item.golfData) {
      const d = item.golfData.diff;
      const playedHoles = (item.golfData.holes || []).filter((h) => h.par > 0);
      const perHoleScores = playedHoles.map((h) => h.strokes).join('  ');
      return {
        main: perHoleScores || `${item.golfData.totalStrokes}`,
        sub: `รวม ${item.golfData.totalStrokes} สโตรก · PAR ${item.golfData.totalPar} (${d >= 0 ? '+' : ''}${d})`,
        isGolfPerHole: true,
      };
    }
    if (item.setsWon && (item.setsWon[0] > 0 || item.setsWon[1] > 0)) {
      const setScores = item.setDetails ? item.setDetails.map((s, i) => `S${i + 1}: ${s.scores[0]}-${s.scores[1]}`).join('  ') : '';
      return { main: `${item.setsWon[0]} - ${item.setsWon[1]}`, sub: setScores || `${item.scores[0]} - ${item.scores[1]}` };
    }
    return { main: `${item.scores[0]} - ${item.scores[1]}`, sub: '' };
  };

  // Helper: format date for search matching (dd/mm/yyyy, d ม.ค. 25xx, etc.)
  const getSearchableDateString = (iso) => {
    const d = new Date(iso);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const yearBE = year + 543;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthTH = months[d.getMonth()];
    // Generate multiple formats for flexible matching
    return [
      `${day}/${month}/${year}`,
      `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`,
      `${day}/${month}/${yearBE}`,
      `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${yearBE}`,
      `${day} ${monthTH} ${yearBE}`,
      `${day} ${monthTH} ${year}`,
      formatDate(iso),
    ].join(' ');
  };

  // Filtered history based on search queries
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Sport/mode filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesSport = (item.sportName || '').toLowerCase().includes(q)
          || (item.sportEmoji || '').includes(q)
          || (MODE_INFO[item.mode]?.label || item.mode || '').toLowerCase().includes(q);
        if (!matchesSport) return false;
      }
      // Date filter
      if (dateQuery.trim()) {
        const dq = dateQuery.trim().toLowerCase();
        const dateStr = getSearchableDateString(item.date).toLowerCase();
        if (!dateStr.includes(dq)) return false;
      }
      return true;
    });
  }, [history, searchQuery, dateQuery]);

  // ---- Detail View ----
  if (selectedItem) {
    const item = selectedItem;
    const sportConf = SPORTS_CONFIG[item.sport] || {};
    const sportColor = sportConf.color || COLORS.secondary;
    const hasSets = item.setDetails && item.setDetails.length > 0;
    return (
      <View style={styles.screenContainer}>
        <View style={styles.historyHeader}>
          <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>
          <Text style={styles.historyTitle}>รายละเอียด</Text>
          <TouchableOpacity onPress={() => handleDeleteItem(item)} style={styles.clearButton} activeOpacity={0.7}>
            <Text style={styles.clearButtonText}>🗑 ลบ</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Header card */}
          <View style={[styles.historyCard, { borderLeftColor: sportColor, marginBottom: 16 }]}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardSport}>{item.sportEmoji} {item.sportName}</Text>
              <View style={[styles.historyModeBadge, { backgroundColor: (MODE_INFO[item.mode]?.color || COLORS.secondary) + '25' }]}>
                <Text style={[styles.historyModeText, { color: MODE_INFO[item.mode]?.color || COLORS.secondary }]}>{MODE_INFO[item.mode]?.label || item.mode}</Text>
              </View>
            </View>

            {/* Final score */}
            {item.golfData ? (
              <>
                <Text style={[styles.historyScore, { fontSize: 42 }]}>{item.golfData.totalStrokes}</Text>
                <Text style={{ color: item.golfData.diff < 0 ? '#30D158' : item.golfData.diff === 0 ? '#FFD700' : '#FF453A', textAlign: 'center', fontSize: 18, fontWeight: '700' }}>
                  {item.golfData.diff >= 0 ? '+' : ''}{item.golfData.diff} (PAR {item.golfData.totalPar})
                </Text>
              </>
            ) : item.chessData ? (
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 16, marginTop: 4 }}>เดิน {item.scores[0]} vs {item.scores[1]} ครั้ง</Text>
            ) : (
              <Text style={[styles.historyScore, { fontSize: 42 }]}>{item.scores[0]} - {item.scores[1]}</Text>
            )}

            {/* Sets won */}
            {!item.golfData && item.setsWon && (item.setsWon[0] > 0 || item.setsWon[1] > 0) && (
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 4, fontWeight: '600' }}>
                Sets: {item.setsWon[0]} - {item.setsWon[1]}
              </Text>
            )}

            <Text style={styles.historyWinner}>{getWinnerText(item)}</Text>

            <View style={[styles.historyMeta, { marginTop: 8 }]}>
              <Text style={styles.historyMetaText}>⏱ รวม {formatTime(item.duration)}</Text>
              <Text style={styles.historyMetaText}>📅 {formatDate(item.date)}</Text>
            </View>
          </View>

          {/* Per-set detail table */}
          {!item.golfData && hasSets && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>📊 รายละเอียดแต่ละเซ็ต</Text>

              {/* Table header */}
              <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4 }}>
                <Text style={{ flex: 1, color: COLORS.textMuted, fontWeight: '600', fontSize: 12 }}>เซ็ต</Text>
                <Text style={{ flex: 2, color: COLORS.textMuted, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Team A</Text>
                <Text style={{ flex: 1, color: COLORS.textMuted, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>-</Text>
                <Text style={{ flex: 2, color: COLORS.textMuted, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Team B</Text>
                <Text style={{ flex: 2, color: COLORS.textMuted, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>เวลา</Text>
              </View>

              {/* Table rows */}
              {item.setDetails.map((sd, idx) => {
                const aWon = sd.scores[0] > sd.scores[1];
                const bWon = sd.scores[1] > sd.scores[0];
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < item.setDetails.length - 1 ? 1 : 0, borderBottomColor: COLORS.border }}>
                    <Text style={{ flex: 1, color: COLORS.text, fontWeight: '700', fontSize: 14 }}>S{idx + 1}</Text>
                    <Text style={{ flex: 2, textAlign: 'center', fontSize: 20, fontWeight: '900', color: aWon ? COLORS.accent : COLORS.text }}>
                      {sd.scores[0]}
                    </Text>
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, color: COLORS.textMuted }}>-</Text>
                    <Text style={{ flex: 2, textAlign: 'center', fontSize: 20, fontWeight: '900', color: bWon ? COLORS.accent : COLORS.text }}>
                      {sd.scores[1]}
                    </Text>
                    <Text style={{ flex: 2, textAlign: 'right', fontSize: 13, color: COLORS.textSecondary }}>
                      {sd.duration != null ? formatTime(sd.duration) : '-'}
                    </Text>
                  </View>
                );
              })}

              {/* Total row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginTop: 4, borderTopWidth: 2, borderTopColor: COLORS.border }}>
                <Text style={{ flex: 1, color: COLORS.warning, fontWeight: '700', fontSize: 13 }}>รวม</Text>
                <Text style={{ flex: 2, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.text }}>
                  {item.scores[0]}
                </Text>
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, color: COLORS.textMuted }}>-</Text>
                <Text style={{ flex: 2, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.text }}>
                  {item.scores[1]}
                </Text>
                <Text style={{ flex: 2, textAlign: 'right', fontSize: 13, fontWeight: '700', color: COLORS.warning }}>
                  {formatTime(item.duration)}
                </Text>
              </View>
            </View>
          )}

          {/* Period info for period-based sports */}
          {!hasSets && !item.chessData && item.currentPeriod && item.currentPeriod > 1 && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>📊 ข้อมูลเพิ่มเติม</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>จำนวนช่วงที่เล่น: {item.currentPeriod}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 4 }}>เวลารวม: {formatTime(item.duration)}</Text>
            </View>
          )}

          {/* Chess-specific detail */}
          {item.chessData && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 14 }}>♟️ รายละเอียดหมากรุก</Text>

              {/* Player cards */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {/* Player 1 */}
                <View style={{ flex: 1, backgroundColor: '#F5F0E1', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A', opacity: 0.6, marginBottom: 4 }}>♔ Player 1 (ขาว)</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: item.winner === 0 ? '#30D158' : '#1A1A1A' }}>
                    {formatTime(item.chessData.timesRemaining[0])}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>เดิน {item.chessData.moves[0]} ครั้ง</Text>
                  {item.winner === 0 && <Text style={{ fontSize: 12, fontWeight: '700', color: '#30D158', marginTop: 4 }}>🏆 ชนะ</Text>}
                </View>
                {/* Player 2 */}
                <View style={{ flex: 1, backgroundColor: '#2C2C2C', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#F5F0E1', opacity: 0.6, marginBottom: 4 }}>♚ Player 2 (ดำ)</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: item.winner === 1 ? '#30D158' : '#F5F0E1' }}>
                    {formatTime(item.chessData.timesRemaining[1])}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>เดิน {item.chessData.moves[1]} ครั้ง</Text>
                  {item.winner === 1 && <Text style={{ fontSize: 12, fontWeight: '700', color: '#30D158', marginTop: 4 }}>🏆 ชนะ</Text>}
                </View>
              </View>

              {/* Time control info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.cardHighlight, borderRadius: 10, padding: 12 }}>
                <View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>เวลาเริ่มต้น</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>{formatTime(item.chessData.initialTime)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Increment</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>+{item.chessData.increment}s</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>รวมเดิน</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>{item.chessData.moves[0] + item.chessData.moves[1]} ครั้ง</Text>
                </View>
              </View>
            </View>
          )}

          {/* Golf scorecard detail */}
          {item.golfData && item.golfData.holes && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              <View style={{ padding: 16, paddingBottom: 8 }}>
                <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>⛳ Scorecard</Text>
              </View>
              {/* Table header */}
              <View style={{ flexDirection: 'row', backgroundColor: COLORS.cardHighlight, paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' }}>หลุม</Text>
                <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>PAR</Text>
                <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>Score</Text>
                <Text style={{ flex: 1.5, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'right' }}>ผล</Text>
              </View>
              {item.golfData.holes.filter((h) => h.par > 0).map((h, idx) => {
                const diff = h.strokes - h.par;
                const labels = { '-3': 'Albatross', '-2': 'Eagle', '-1': 'Birdie', '0': 'Par', '1': 'Bogey', '2': 'Dbl Bogey', '3': 'Trpl Bogey' };
                const label = labels[String(diff)] || (diff > 0 ? `+${diff}` : `${diff}`);
                const color = diff < 0 ? '#30D158' : diff === 0 ? COLORS.text : '#FF453A';
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                    <Text style={{ flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '700' }}>{h.holeNumber}</Text>
                    <Text style={{ flex: 1, color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>{h.par}</Text>
                    <Text style={{ flex: 1, color, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>{h.strokes}</Text>
                    <Text style={{ flex: 1.5, color, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{label}</Text>
                  </View>
                );
              })}
              {/* Total */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.cardHighlight }}>
                <Text style={{ flex: 1, color: COLORS.warning, fontSize: 13, fontWeight: '700' }}>รวม</Text>
                <Text style={{ flex: 1, color: COLORS.warning, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{item.golfData.totalPar}</Text>
                <Text style={{ flex: 1, color: COLORS.warning, fontSize: 16, fontWeight: '900', textAlign: 'center' }}>{item.golfData.totalStrokes}</Text>
                <Text style={{ flex: 1.5, color: item.golfData.diff < 0 ? '#30D158' : item.golfData.diff === 0 ? '#FFD700' : '#FF453A', fontSize: 13, fontWeight: '700', textAlign: 'right' }}>{item.golfData.diff >= 0 ? '+' : ''}{item.golfData.diff}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---- List View ----
  const renderItem = ({ item }) => {
    const scoreDisplay = getScoreDisplay(item);
    const sportConf = SPORTS_CONFIG[item.sport] || {};
    return (
      <TouchableOpacity
        style={[styles.historyCard, { borderLeftColor: sportConf.color || COLORS.secondary, flex: numColumns === 2 ? 1 : undefined, margin: 6 }]}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.historyCardHeader}>
          <Text style={styles.historyCardSport}>{item.sportEmoji} {item.sportName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.historyModeBadge, { backgroundColor: (MODE_INFO[item.mode]?.color || COLORS.secondary) + '25' }]}>
              <Text style={[styles.historyModeText, { color: MODE_INFO[item.mode]?.color || COLORS.secondary }]}>{MODE_INFO[item.mode]?.label || item.mode}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 2 }}
            >
              <Text style={{ color: COLORS.danger, fontSize: 16 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.historyScore, scoreDisplay.isGolfPerHole && { fontSize: 16, letterSpacing: 2 }]}>{scoreDisplay.main}</Text>
        {scoreDisplay.sub ? <Text style={styles.historySetDetail}>{scoreDisplay.sub}</Text> : null}
        <Text style={styles.historyWinner}>{getWinnerText(item)}</Text>
        <View style={styles.historyMeta}>
          <Text style={styles.historyMetaText}>⏱ {formatTime(item.duration)}</Text>
          <Text style={styles.historyMetaText}>📅 {formatDate(item.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.historyHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.historyTitle}>📋 ประวัติการเล่น</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton} activeOpacity={0.7}>
            <Text style={styles.clearButtonText}>🗑 ลบทั้งหมด</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>กำลังโหลด...</Text></View>
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>ยังไม่มีประวัติ</Text>
          <Text style={styles.emptyText}>เริ่มเล่นเกมเพื่อดูประวัติที่นี่!</Text>
        </View>
      ) : (
        <>
          {/* Search bar */}
          <View style={{ paddingHorizontal: isLandscape ? 10 : 16, paddingTop: 10, paddingBottom: 4, gap: 8 }}>
            <TextInput
              style={{ backgroundColor: COLORS.cardHighlight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="🔍 ค้นหาตามกีฬา..."
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={{ backgroundColor: COLORS.cardHighlight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border }}
              value={dateQuery}
              onChangeText={setDateQuery}
              placeholder="📅 ค้นหาตามวันที่ เช่น 17/4/2569 หรือ เม.ย."
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <FlatList
            data={filteredHistory}
            key={numColumns}
            numColumns={numColumns}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: isLandscape ? 10 : 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyState, { paddingTop: 40 }]}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
                <Text style={styles.emptyTitle}>ไม่พบผลลัพธ์</Text>
                <Text style={styles.emptyText}>ลองค้นหาด้วยคำอื่น</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}
