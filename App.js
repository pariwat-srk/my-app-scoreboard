import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/constants';
import { saveGameToHistory } from './src/helpers';
import { HomeScreen } from './src/HomeScreen';
import { ScoreboardScreen } from './src/ScoreboardScreen';
import { HistoryScreen } from './src/HistoryScreen';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [gameConfig, setGameConfig] = useState(null);

  const handleStartGame = (config) => { setGameConfig(config); setScreen('scoreboard'); };
  const handleEndGame = async (result) => { await saveGameToHistory(result); setGameConfig(null); setScreen('home'); };

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <HomeScreen onStartGame={handleStartGame} onViewHistory={() => setScreen('history')} />;
      case 'scoreboard': return <ScoreboardScreen config={gameConfig} onEndGame={handleEndGame} />;
      case 'history': return <HistoryScreen onBack={() => setScreen('home')} />;
      default: return <HomeScreen onStartGame={handleStartGame} onViewHistory={() => setScreen('history')} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>{renderScreen()}</SafeAreaView>
    </SafeAreaProvider>
  );
}