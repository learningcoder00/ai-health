import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="heart" size={48} color="#fff" />
          <Title style={styles.headerTitle}>AI健康管家</Title>
          <Paragraph style={styles.headerSubtitle}>您的专属健康助手</Paragraph>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Card style={styles.card} onPress={() => navigation.navigate('药品')}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons name="medical" size={32} color={theme.colors.primary} />
              <Title style={styles.cardTitle}>药品管理</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              拍摄药盒，智能识别药品信息，设置定时提醒
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => navigation.navigate('设备')}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons name="watch" size={32} color={theme.colors.secondary} />
              <Title style={styles.cardTitle}>设备数据</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              连接智能手环、血糖仪，实时监测健康数据
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => navigation.navigate('报告')}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={32} color={theme.colors.accent} />
              <Title style={styles.cardTitle}>健康报告</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              生成个性化周/月健康报告，全面了解身体状况
            </Paragraph>
          </Card.Content>
        </Card>

        <View style={styles.quickActions}>
          <Button
            mode="contained"
            icon="camera"
            onPress={() => navigation.navigate('药品')}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            拍摄药盒
          </Button>
          <Button
            mode="outlined"
            icon="chart-line"
            onPress={() => navigation.navigate('报告')}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            查看报告
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: theme.spacing.md,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
    marginTop: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    marginLeft: theme.spacing.sm,
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionButton: {
    borderRadius: theme.borderRadius.md,
  },
  actionButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
});

