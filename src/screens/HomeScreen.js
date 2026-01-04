import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Text, Dialog, Portal, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { CloudSyncService } from '../services/CloudSyncService';
import { AuthService } from '../services/AuthService';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [syncing, setSyncing] = useState(false);
  const [accountDialogVisible, setAccountDialogVisible] = useState(false);
  const [pwdDialogVisible, setPwdDialogVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountInfo, setAccountInfo] = useState({ profile: null, cloudMeta: null });

  const syncUp = async () => {
    try {
      setSyncing(true);
      await CloudSyncService.syncUp();
      Alert.alert('成功', '已上传到云端');
    } catch (e) {
      if (String(e.message || '').includes('conflict')) {
        Alert.alert(
          '发现冲突',
          '云端有更新的数据。建议先“从云端下载”。如果确定要用本地覆盖云端，请选择“强制上传”。',
          [
            { text: '取消', style: 'cancel' },
            { text: '从云端下载', onPress: syncDown },
            {
              text: '强制上传',
              style: 'destructive',
              onPress: async () => {
                try {
                  setSyncing(true);
                  await CloudSyncService.forceSyncUp();
                  Alert.alert('成功', '已强制覆盖云端');
                } catch (err) {
                  Alert.alert('同步失败', err.message || '强制上传失败');
                } finally {
                  setSyncing(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('同步失败', e.message || '请检查云端服务是否启动');
      }
    } finally {
      setSyncing(false);
    }
  };

  const syncDown = async () => {
    try {
      setSyncing(true);
      await CloudSyncService.syncDown();
      Alert.alert('成功', '已从云端下载并覆盖本地数据');
    } catch (e) {
      Alert.alert('同步失败', e.message || '请检查云端服务是否启动');
    } finally {
      setSyncing(false);
    }
  };

  const openAccountDialog = async () => {
    try {
      const profile = await AuthService.getProfile();
      const cloudMeta = await CloudSyncService.getCloudMeta();
      setAccountInfo({ profile, cloudMeta });
    } catch {
      setAccountInfo({ profile: null, cloudMeta: null });
    }
    setAccountDialogVisible(true);
  };

  const logout = async () => {
    await AuthService.logout();
    Alert.alert('已退出', '请重新登录');
  };

  const changePassword = async () => {
    try {
      await AuthService.changePassword({ oldPassword, newPassword });
      setPwdDialogVisible(false);
      setOldPassword('');
      setNewPassword('');
      Alert.alert('成功', '密码已修改');
    } catch (e) {
      Alert.alert('失败', e.message || '修改密码失败');
    }
  };

  const deleteAccount = async () => {
    Alert.alert(
      '注销账号',
      '将删除云端账号与云端数据（本地数据不会自动删除）。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认注销',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteAccount();
              Alert.alert('已注销', '账号已删除，请重新注册/登录');
            } catch (e) {
              Alert.alert('失败', e.message || '注销失败');
            }
          },
        },
      ]
    );
  };

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
        <Card style={styles.card} onPress={openAccountDialog}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle" size={32} color={theme.colors.primary} />
              <Title style={styles.cardTitle}>账号与云同步</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              查看账号信息、云端版本号，支持修改密码/退出/注销
            </Paragraph>
          </Card.Content>
        </Card>

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

          <Button
            mode="contained"
            icon="cloud-upload"
            loading={syncing}
            disabled={syncing}
            onPress={syncUp}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            上传到云端
          </Button>
          <Button
            mode="outlined"
            icon="cloud-download"
            loading={syncing}
            disabled={syncing}
            onPress={syncDown}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            从云端下载
          </Button>
        </View>
      </View>

      <Portal>
        <Dialog visible={accountDialogVisible} onDismiss={() => setAccountDialogVisible(false)}>
          <Dialog.Title>账号与云同步</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              {accountInfo.profile
                ? `当前用户：${accountInfo.profile.name}（${accountInfo.profile.email}）`
                : '当前未获取到用户资料'}
            </Paragraph>
            <Paragraph style={{ marginTop: theme.spacing.sm }}>
              {accountInfo.cloudMeta?.revision
                ? `云端版本：${accountInfo.cloudMeta.revision}（${accountInfo.cloudMeta.updatedAt || '未知时间'}）`
                : '云端版本：暂无（建议先上传或下载）'}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPwdDialogVisible(true)}>修改密码</Button>
            <Button onPress={deleteAccount} textColor={theme.colors.error}>注销账号</Button>
            <Button onPress={logout}>退出登录</Button>
            <Button onPress={() => setAccountDialogVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={pwdDialogVisible} onDismiss={() => setPwdDialogVisible(false)}>
          <Dialog.Title>修改密码</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="旧密码"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="新密码（至少6位）"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPwdDialogVisible(false)}>取消</Button>
            <Button onPress={changePassword} disabled={!oldPassword || !newPassword}>
              确定
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  input: {
    marginBottom: theme.spacing.sm,
  },
});

