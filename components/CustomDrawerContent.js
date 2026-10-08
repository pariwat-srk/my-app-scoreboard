import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from 'react-native-vector-icons';

const QUICK_LINKS = [
  { label: 'ช่วยเหลือ', icon: 'help-circle-outline', color: '#4facfe' },
  { label: 'ตั้งค่า', icon: 'cog-outline', color: '#43e97b' },
  { label: 'ออกจากระบบ', icon: 'logout', color: '#f5576c' },
];

export default function CustomDrawerContent(props) {
  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="sail-boat" size={30} color="#ffffff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.appName}>MyBoat</Text>
              <Text style={styles.appVersion}>v1.0.0</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        {/* Nav Items */}
        <DrawerItemList {...props} />

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <Text style={styles.quickLinksTitle}>ลิงก์ด่วน</Text>
          {QUICK_LINKS.map((link, i) => (
            <TouchableOpacity key={i} style={styles.quickLinkItem} activeOpacity={0.6}>
              <MaterialCommunityIcons name={link.icon} size={20} color={link.color} />
              <Text style={styles.quickLinkLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <View style={styles.footerContent}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#6b6b8d" />
          <Text style={styles.footerText}>สร้างด้วย React Navigation</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12121f',
  },
  scrollContent: {
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  headerText: {
    marginLeft: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  appVersion: {
    fontSize: 12,
    color: '#6b6b8d',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  quickLinks: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  quickLinksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b6b8d',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quickLinkLabel: {
    fontSize: 14,
    color: '#a0a0c0',
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b6b8d',
    marginLeft: 8,
  },
});
