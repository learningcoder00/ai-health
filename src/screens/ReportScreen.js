import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Share,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  SegmentedButtons,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ReportService } from '../services/ReportService';

const { width } = Dimensions.get('window');

export default function ReportScreen() {
  const [reportType, setReportType] = useState('week');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const loadReport = async () => {
    setLoading(true);
    const data = await ReportService.generateReport(reportType);
    setReport(data);
    setLoading(false);
  };

  const shareReport = async () => {
    try {
      const message = `我的${reportType === 'week' ? '周' : '月'}健康报告\n\n` +
        `平均心率: ${report.avgHeartRate} bpm\n` +
        `平均血糖: ${report.avgBloodGlucose} mmol/L\n` +
        `平均睡眠: ${report.avgSleep} 小时\n` +
        `健康评分: ${report.healthScore}/100`;
      
      await Share.share({
        message,
        title: '健康报告',
      });
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>正在生成报告...</Text>
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={theme.colors.textSecondary} />
          <Title style={styles.emptyTitle}>暂无报告数据</Title>
          <Paragraph style={styles.emptyText}>
            请先连接设备并收集健康数据
          </Paragraph>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 报告类型选择 */}
        <Card style={styles.card}>
          <Card.Content>
            <SegmentedButtons
              value={reportType}
              onValueChange={setReportType}
              buttons={[
                { value: 'week', label: '周报告' },
                { value: 'month', label: '月报告' },
              ]}
            />
          </Card.Content>
        </Card>

        {/* 健康评分 */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.scoreHeader}>
              <Title style={styles.scoreTitle}>健康评分</Title>
              <Text style={styles.scoreValue}>{report.healthScore}/100</Text>
            </View>
            <ProgressBar
              progress={report.healthScore / 100}
              color={getScoreColor(report.healthScore)}
              style={styles.progressBar}
            />
            <Paragraph style={styles.scoreDescription}>
              {getScoreDescription(report.healthScore)}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* 数据概览 */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>数据概览</Title>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <Ionicons name="heart" size={32} color={theme.colors.error} />
                <Text style={styles.overviewValue}>{report.avgHeartRate}</Text>
                <Text style={styles.overviewLabel}>平均心率 (bpm)</Text>
              </View>
              <View style={styles.overviewItem}>
                <Ionicons name="water" size={32} color={theme.colors.secondary} />
                <Text style={styles.overviewValue}>{report.avgBloodGlucose}</Text>
                <Text style={styles.overviewLabel}>平均血糖 (mmol/L)</Text>
              </View>
              <View style={styles.overviewItem}>
                <Ionicons name="moon" size={32} color={theme.colors.accent} />
                <Text style={styles.overviewValue}>{report.avgSleep}</Text>
                <Text style={styles.overviewLabel}>平均睡眠 (小时)</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 趋势分析 */}
        {report.trends && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>心率趋势</Title>
                <LineChart
                  data={report.trends.heartRate}
                  width={width - 64}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </Card.Content>
            </Card>
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>血糖趋势</Title>
                <LineChart
                  data={report.trends.bloodGlucose}
                  width={width - 64}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(80, 200, 120, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </Card.Content>
            </Card>
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>睡眠趋势</Title>
                <LineChart
                  data={report.trends.sleep}
                  width={width - 64}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </Card.Content>
            </Card>
          </>
        )}

        {/* 健康建议 */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>健康建议</Title>
            {report.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.success}
                  style={styles.recommendationIcon}
                />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* 分享按钮 */}
        <Button
          mode="contained"
          icon="share"
          onPress={shareReport}
          style={styles.shareButton}
          contentStyle={styles.shareButtonContent}
        >
          分享报告
        </Button>
      </View>
    </ScrollView>
  );
}

const getScoreColor = (score) => {
  if (score >= 80) return theme.colors.success;
  if (score >= 60) return theme.colors.warning;
  return theme.colors.error;
};

const getScoreDescription = (score) => {
  if (score >= 80) return '您的健康状况良好，请继续保持！';
  if (score >= 60) return '您的健康状况一般，建议改善生活习惯。';
  return '您的健康状况需要关注，建议咨询医生。';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: theme.spacing.sm,
  },
  scoreDescription: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  overviewLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  recommendationIcon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    color: theme.colors.text,
    lineHeight: 20,
  },
  shareButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  shareButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
});

