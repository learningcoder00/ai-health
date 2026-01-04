import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  FAB,
  Chip,
  Dialog,
  Portal,
  TextInput,
  ActivityIndicator,
  SegmentedButtons,
  ProgressBar,
  Switch,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { MedicineService } from '../services/MedicineService';
import { validateMedicineName, validateTimesText, validateDateRange } from '../utils/validation';

export default function MedicineScreen() {
  const [medicines, setMedicines] = useState([]);
  const [todayRemindersByMedicine, setTodayRemindersByMedicine] = useState({}); // { [medicineId]: Reminder[] }
  const [dialogVisible, setDialogVisible] = useState(false);
  const [sourceDialogVisible, setSourceDialogVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null); // 正在编辑的药品
  const [medicineDetails, setMedicineDetails] = useState(null); // 药品详细信息（来自数据库）
  const [detailsDialogVisible, setDetailsDialogVisible] = useState(false); // 详情对话框
  const [selectedImageForOCR, setSelectedImageForOCR] = useState(null); // 选择用于OCR识别的图片
  const [recognitionResult, setRecognitionResult] = useState(null); // 识别结果
  const [errorDialogVisible, setErrorDialogVisible] = useState(false); // 错误对话框
  const [errorMessage, setErrorMessage] = useState(''); // 错误信息

  // 手动录入兜底
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDosage, setManualDosage] = useState('');
  const [manualFrequency, setManualFrequency] = useState('');

  // 提醒设置与统计
  const [reminderSettingsVisible, setReminderSettingsVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeMedicineForSettings, setActiveMedicineForSettings] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderPaused, setReminderPaused] = useState(false);
  const [reminderTimesText, setReminderTimesText] = useState('08:00,20:00');
  const [therapyStartDate, setTherapyStartDate] = useState('');
  const [therapyEndDate, setTherapyEndDate] = useState('');
  const [statsDays, setStatsDays] = useState('7');
  const [statsData, setStatsData] = useState(null);

  useEffect(() => {
    loadMedicines();
    requestPermissions();
  }, []);

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return '';
    }
  };

  const requestPermissions = async () => {
    try {
      // Web平台不需要请求这些权限
      if (Platform.OS === 'web') {
        return;
      }
      
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      
      if (cameraStatus !== 'granted' || notificationStatus !== 'granted') {
        Alert.alert('权限提示', '需要相机和通知权限才能使用完整功能');
      }
    } catch (error) {
      console.log('权限请求失败:', error);
      // Web平台上忽略权限错误
    }
  };

  const loadMedicines = async () => {
    const data = await MedicineService.getAllMedicines();
    setMedicines(data);
    // 同步加载“今日提醒”
    try {
      const pairs = await Promise.all(
        data.map(async (m) => [m.id, await MedicineService.getTodayReminders(m.id)])
      );
      setTodayRemindersByMedicine(Object.fromEntries(pairs));
    } catch (e) {
      console.warn('加载今日提醒失败:', e);
    }
  };

  const refreshTodayReminders = async () => {
    try {
      const pairs = await Promise.all(
        medicines.map(async (m) => [m.id, await MedicineService.getTodayReminders(m.id)])
      );
      setTodayRemindersByMedicine(Object.fromEntries(pairs));
    } catch (e) {
      console.warn('刷新今日提醒失败:', e);
    }
  };

  const markTaken = async (medicineId, reminderId) => {
    try {
      await MedicineService.markReminderTaken({ medicineId, reminderId });
      await refreshTodayReminders();
    } catch (e) {
      Alert.alert('错误', e.message || '打卡失败，请重试');
    }
  };

  const snooze10m = async (medicineId, reminderId) => {
    try {
      await MedicineService.snoozeReminderMinutes({ medicineId, reminderId, minutes: 10 });
      await refreshTodayReminders();
    } catch (e) {
      Alert.alert('错误', e.message || '稍后提醒失败，请重试');
    }
  };

  const snoozePick = (medicineId, reminderId) => {
    Alert.alert(
      '稍后提醒',
      '选择推迟时间：',
      [
        { text: '取消', style: 'cancel' },
        { text: '5分钟', onPress: () => MedicineService.snoozeReminderMinutes({ medicineId, reminderId, minutes: 5 }).then(refreshTodayReminders) },
        { text: '15分钟', onPress: () => MedicineService.snoozeReminderMinutes({ medicineId, reminderId, minutes: 15 }).then(refreshTodayReminders) },
        { text: '30分钟', onPress: () => MedicineService.snoozeReminderMinutes({ medicineId, reminderId, minutes: 30 }).then(refreshTodayReminders) },
      ]
    );
  };

  const openReminderSettings = (medicine) => {
    setActiveMedicineForSettings(medicine);
    const cfg = medicine.reminderConfig || {};
    setReminderEnabled(cfg.enabled !== false);
    setReminderPaused(cfg.paused === true);
    setReminderTimesText(Array.isArray(cfg.times) && cfg.times.length ? cfg.times.join(',') : '08:00,20:00');
    setTherapyStartDate(cfg.startDate || '');
    setTherapyEndDate(cfg.endDate || '');
    setReminderSettingsVisible(true);
  };

  const saveReminderSettings = async () => {
    if (!activeMedicineForSettings) return;
    const vt = validateTimesText(reminderTimesText);
    if (!vt.ok) {
      Alert.alert('提示', vt.message);
      return;
    }
    const dr = validateDateRange(therapyStartDate, therapyEndDate);
    if (!dr.ok) {
      Alert.alert('提示', dr.message);
      return;
    }
    try {
      await MedicineService.updateReminderConfig(activeMedicineForSettings.id, {
        enabled: reminderEnabled,
        paused: reminderPaused,
        times: vt.times,
        startDate: therapyStartDate || undefined,
        endDate: therapyEndDate || undefined,
      });
      setReminderSettingsVisible(false);
      await loadMedicines();
      Alert.alert('成功', '提醒设置已更新');
    } catch (e) {
      Alert.alert('失败', e.message || '保存提醒设置失败');
    }
  };

  const openStats = async (medicine) => {
    setActiveMedicineForSettings(medicine);
    setStatsVisible(true);
    try {
      const data = await MedicineService.getAdherenceStats(medicine.id, Number(statsDays));
      setStatsData(data);
    } catch (e) {
      setStatsData(null);
      Alert.alert('失败', e.message || '加载统计失败');
    }
  };

  const showImageSourceDialog = () => {
    setSourceDialogVisible(true);
  };

  const selectFromCamera = async () => {
    setSourceDialogVisible(false);
    try {
      // 请求相机权限
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('权限提示', '需要相机权限才能拍摄照片');
          return;
        }
      }

      const remainingSlots = 9 - selectedImages.length;
      if (remainingSlots <= 0) {
        Alert.alert('提示', '最多只能上传9张图片');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...selectedImages, ...result.assets.map(asset => asset.uri)];
        if (newImages.length > 9) {
          Alert.alert('提示', '最多只能上传9张图片，已自动选择前9张');
          setSelectedImages(newImages.slice(0, 9));
        } else {
          setSelectedImages(newImages);
        }
        
        // 上传照片后，不自动识别，等待用户点击OCR识别按钮
        setDialogVisible(true);
      }
    } catch (error) {
      Alert.alert('错误', '拍摄失败，请重试');
      console.error('相机错误:', error);
    }
  };

  const selectFromGallery = async () => {
    setSourceDialogVisible(false);
    try {
      // 请求相册权限
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('权限提示', '需要相册权限才能选择图片');
          return;
        }
      }

      const remainingSlots = 9 - selectedImages.length;
      if (remainingSlots <= 0) {
        Alert.alert('提示', '最多只能上传9张图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // 多选时不支持编辑
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...selectedImages, ...result.assets.map(asset => asset.uri)];
        if (newImages.length > 9) {
          Alert.alert('提示', '最多只能上传9张图片，已自动选择前9张');
          setSelectedImages(newImages.slice(0, 9));
        } else {
          setSelectedImages(newImages);
        }
        
        // 上传照片后，不自动识别，等待用户点击OCR识别按钮
        setDialogVisible(true);
      }
    } catch (error) {
      Alert.alert('错误', '选择图片失败，请重试');
      console.error('相册错误:', error);
    }
  };

  // OCR识别函数 - 手动触发
  const performOCRRecognition = async () => {
    console.log('开始识别，selectedImages:', selectedImages);
    
    if (selectedImages.length === 0) {
      setErrorMessage('请先上传药品照片');
      setErrorDialogVisible(true);
      return;
    }

    // 使用第一张图片进行识别
    const imageToRecognize = selectedImages[0];
    console.log('准备识别图片:', imageToRecognize);
    setSelectedImageForOCR(imageToRecognize);
    setRecognizing(true);

    try {
      console.log('调用 MedicineService.recognizeMedicine...');
      const recognizedData = await MedicineService.recognizeMedicine(imageToRecognize);
      console.log('识别结果:', recognizedData);
      
      // 保存识别结果
      setRecognitionResult(recognizedData);
      
      // 如果查询到详细的药品信息，保存起来
      if (recognizedData.hasDetails) {
        setMedicineDetails(recognizedData);
        console.log('查询到详细药品信息:', recognizedData);
        // 识别成功，直接显示详情对话框
        setRecognizing(false);
        setDetailsDialogVisible(true);
      } else if (recognizedData.name) {
        // 识别到药品名称但没有详细信息
        setMedicineDetails(recognizedData);
        console.log('识别到药品名称，但无详细信息:', recognizedData);
        setRecognizing(false);
        // 直接显示详情对话框，即使没有详细信息也显示识别结果
        setDetailsDialogVisible(true);
      } else {
        // 未识别到药品名称
        setRecognizing(false);
        setErrorMessage('未能识别出药品信息，请确保图片清晰且包含药品名称');
        setErrorDialogVisible(true);
        setManualEntryMode(false);
      }
    } catch (error) {
      console.error('OCR识别错误:', error);
      setRecognizing(false);
      setErrorMessage(error.message || '无法识别图片，请检查网络连接后重试');
      setErrorDialogVisible(true);
      setManualEntryMode(false);
    }
  };

  const saveMedicine = async () => {
    const canUseRecognition = recognitionResult && recognitionResult.name;
    const canUseManual = manualEntryMode && manualName;
    if (!canUseRecognition && !canUseManual) {
      Alert.alert('提示', '请先识别药品信息，或选择手动录入');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('提示', '请至少上传一张图片');
      return;
    }

    try {
      const medicineName = canUseRecognition ? recognitionResult.name : manualName;
      const dosage = canUseRecognition
        ? (recognitionResult.dosage || '每次1片')
        : (manualDosage || '每次1片');
      const frequency = canUseRecognition
        ? (recognitionResult.frequency || '每日2次')
        : (manualFrequency || '每日2次');

      if (editingMedicine) {
        // 更新现有药品
        const updatedMedicine = {
          name: medicineName,
          dosage,
          frequency,
          images: selectedImages,
          image: selectedImages[0],
        };
        await MedicineService.updateMedicine(editingMedicine.id, updatedMedicine);
        Alert.alert('成功', '药品信息已更新，提醒已重新设置');
      } else {
        // 添加新药品
        if (!canUseRecognition) {
          const vn = validateMedicineName(medicineName);
          if (!vn.ok) throw new Error(vn.message);
        }
        const medicine = {
          id: Date.now().toString(),
          name: medicineName,
          dosage,
          frequency,
          images: selectedImages,
          image: selectedImages[0],
          createdAt: new Date().toISOString(),
          reminderConfig: {
            enabled: true,
            paused: false,
            times: ['08:00', '20:00'],
          },
        };
        await MedicineService.saveMedicine(medicine);
        await MedicineService.scheduleReminders(medicine);
        Alert.alert('成功', '药品已添加，提醒已设置');
      }
      
      setDialogVisible(false);
      setSourceDialogVisible(false);
      setSelectedImages([]);
      setRecognitionResult(null);
      setMedicineDetails(null);
      setEditingMedicine(null);
      setManualEntryMode(false);
      setManualName('');
      setManualDosage('');
      setManualFrequency('');
      
      loadMedicines();
    } catch (error) {
      Alert.alert('错误', error.message || '操作失败，请重试');
    }
  };

  const editMedicine = (medicine) => {
    setEditingMedicine(medicine);
    setSelectedImages(medicine.images || (medicine.image ? [medicine.image] : []));
    // 设置识别结果为现有药品信息
    setRecognitionResult({
      name: medicine.name || '',
      dosage: medicine.dosage || '',
      frequency: medicine.frequency || '',
    });
    setDialogVisible(true);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const deleteMedicine = async (id) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个药品吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await MedicineService.deleteMedicine(id);
            await MedicineService.cancelReminders(id);
            loadMedicines();
          },
        },
      ]
    );
  };

  const exportMedicines = async () => {
    try {
      const result = await ExportService.exportMedicines('csv');
      if (result.success) {
        Alert.alert('成功', result.message || '药品信息已导出');
      }
    } catch (error) {
      Alert.alert('错误', '导出失败，请重试');
      console.error('导出药品信息失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {medicines.length > 0 && (
          <Card style={styles.exportCard}>
            <Card.Content>
              <Button
                mode="outlined"
                icon="download"
                onPress={exportMedicines}
                style={styles.exportButton}
              >
                导出药品信息 (CSV)
              </Button>
            </Card.Content>
          </Card>
        )}
        {medicines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color={theme.colors.textSecondary} />
            <Title style={styles.emptyTitle}>暂无药品</Title>
            <Paragraph style={styles.emptyText}>
              点击右下角按钮拍摄药盒，智能识别药品信息
            </Paragraph>
          </View>
        ) : (
          medicines.map((medicine) => {
            const images = medicine.images || (medicine.image ? [medicine.image] : []);
            return (
              <Card key={medicine.id} style={styles.medicineCard}>
                {images.length > 0 && (
                  <ScrollView 
                    horizontal 
                    pagingEnabled 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageScrollView}
                  >
                    {images.map((img, idx) => (
                      <Image 
                        key={idx} 
                        source={{ uri: img }} 
                        style={styles.medicineImage} 
                      />
                    ))}
                  </ScrollView>
                )}
                <Card.Content>
                  <View style={styles.medicineHeader}>
                    <Title style={styles.medicineName}>{medicine.name}</Title>
                    <View style={styles.medicineActions}>
                      <TouchableOpacity 
                        onPress={() => editMedicine(medicine)}
                        style={styles.actionButton}
                      >
                        <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => deleteMedicine(medicine.id)}
                        style={styles.actionButton}
                      >
                        <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {images.length > 1 && (
                    <Chip icon="images" style={styles.chip}>
                      {images.length} 张图片
                    </Chip>
                  )}
                  <View style={styles.medicineInfo}>
                    <Chip icon="flask" style={styles.chip}>
                      {medicine.dosage}
                    </Chip>
                    <Chip icon="time" style={styles.chip}>
                      {medicine.frequency}
                    </Chip>
                  </View>

                  {/* 今日提醒（闭环打卡） */}
                  <View style={styles.remindersContainer}>
                    <Text style={styles.remindersTitle}>今日提醒</Text>
                    {(todayRemindersByMedicine[medicine.id] || []).length === 0 ? (
                      <Text style={styles.remindersEmpty}>今日暂无提醒</Text>
                    ) : (
                      (todayRemindersByMedicine[medicine.id] || []).map((r) => (
                        <View key={r.id} style={styles.reminderRow}>
                          <Text style={styles.reminderTime}>{formatTime(r.scheduledAt)}</Text>
                          <Chip
                            style={styles.reminderStatusChip}
                            icon={
                              r.status === 'taken'
                                ? 'check'
                                : r.status === 'missed'
                                  ? 'close'
                                  : r.status === 'snoozed'
                                    ? 'clock'
                                    : 'bell'
                            }
                          >
                            {r.status === 'taken'
                              ? '已服'
                              : r.status === 'missed'
                                ? '漏服'
                                : r.status === 'snoozed'
                                  ? '稍后'
                                  : '待服'}
                          </Chip>

                          {(r.status === 'scheduled' || r.status === 'snoozed') && (
                            <View style={styles.reminderActions}>
                              <Button
                                mode="outlined"
                                compact
                                onPress={() => markTaken(medicine.id, r.id)}
                                style={styles.reminderActionButton}
                              >
                                已服
                              </Button>
                              <Button
                                mode="outlined"
                                compact
                                disabled={Platform.OS === 'web'}
                                onPress={() => snoozePick(medicine.id, r.id)}
                                style={styles.reminderActionButton}
                              >
                                稍后...
                              </Button>
                            </View>
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.reminderFooterActions}>
                    <Button mode="text" onPress={() => openReminderSettings(medicine)}>
                      提醒设置
                    </Button>
                    <Button mode="text" onPress={() => openStats(medicine)}>
                      统计
                    </Button>
                  </View>
                  <Paragraph style={styles.medicineDate}>
                    添加时间: {new Date(medicine.createdAt).toLocaleDateString('zh-CN')}
                  </Paragraph>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      <FAB
        icon="camera"
        style={styles.fab}
        onPress={showImageSourceDialog}
        label="拍摄药盒"
      />

      <Portal>
        {/* 选择图片来源对话框 */}
        <Dialog visible={sourceDialogVisible} onDismiss={() => setSourceDialogVisible(false)}>
          <Dialog.Title>选择图片来源</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogText}>
              当前已选择 {selectedImages.length}/9 张图片
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSourceDialogVisible(false)}>取消</Button>
            {Platform.OS !== 'web' && (
              <Button onPress={selectFromCamera} icon="camera" mode="contained">
                相机拍摄
              </Button>
            )}
            <Button onPress={selectFromGallery} icon="image" mode="contained">
              相册选择
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* 确认药品信息对话框 */}
        <Dialog 
          visible={dialogVisible} 
          onDismiss={() => {
            setDialogVisible(false);
            setSelectedImages([]);
            setEditingMedicine(null);
            setMedicineDetails(null);
            setSelectedImageForOCR(null);
            setRecognizing(false);
            setRecognitionResult(null);
            setManualEntryMode(false);
            setManualName('');
            setManualDosage('');
            setManualFrequency('');
          }}
        >
          <Dialog.Title>{editingMedicine ? '编辑药品信息' : '确认药品信息'}</Dialog.Title>
          <Dialog.Content>
            {recognizing && (
              <View style={styles.recognizingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.recognizingText}>正在识别药品信息...</Text>
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScrollView}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.previewImageContainer}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {selectedImages.length < 9 && (
              <Button
                mode="outlined"
                icon="plus"
                onPress={showImageSourceDialog}
                style={styles.addMoreButton}
              >
                添加更多图片 ({selectedImages.length}/9)
              </Button>
            )}
            
            {/* OCR识别按钮 */}
            {selectedImages.length > 0 && (
              <Button
                mode="contained"
                icon={recognizing ? undefined : "barcode-scan"}
                onPress={() => {
                  console.log('识别按钮被点击，recognizing:', recognizing);
                  if (!recognizing) {
                    performOCRRecognition();
                  }
                }}
                style={styles.ocrButton}
                disabled={recognizing}
                loading={recognizing}
              >
                {recognizing ? '正在识别...' : '识别药品'}
              </Button>
            )}

            {/* 识别失败/无结果时可切换为手动录入 */}
            {selectedImages.length > 0 && !recognizing && !manualEntryMode && !(recognitionResult && recognitionResult.name) && (
              <Button
                mode="outlined"
                icon="pencil"
                onPress={() => {
                  setManualEntryMode(true);
                  // 预填默认值
                  setManualDosage('每次1片');
                  setManualFrequency('每日2次');
                }}
                style={styles.manualEntryButton}
              >
                手动录入
              </Button>
            )}

            {/* 显示识别结果 */}
            {recognitionResult && recognitionResult.name && (
              <View style={styles.recognitionResultContainer}>
                <Text style={styles.recognitionResultTitle}>识别结果：</Text>
                <Text style={styles.recognitionResultText}>药品名称：{recognitionResult.name}</Text>
                {recognitionResult.dosage && (
                  <Text style={styles.recognitionResultText}>服用剂量：{recognitionResult.dosage}</Text>
                )}
                {recognitionResult.frequency && (
                  <Text style={styles.recognitionResultText}>服用频率：{recognitionResult.frequency}</Text>
                )}
              </View>
            )}

            {/* 手动录入表单（兜底） */}
            {manualEntryMode && (
              <View style={styles.manualFormContainer}>
                <Text style={styles.manualFormTitle}>手动录入药品信息</Text>
                <TextInput
                  label="药品名称"
                  value={manualName}
                  onChangeText={setManualName}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="服用剂量（可选）"
                  value={manualDosage}
                  onChangeText={setManualDosage}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="服用频率（可选）"
                  value={manualFrequency}
                  onChangeText={setManualFrequency}
                  mode="outlined"
                  style={styles.input}
                />
                <Button
                  mode="text"
                  onPress={() => {
                    setManualEntryMode(false);
                    setManualName('');
                    setManualDosage('');
                    setManualFrequency('');
                  }}
                >
                  取消手动录入
                </Button>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setDialogVisible(false);
                setSelectedImages([]);
                setEditingMedicine(null);
                setMedicineDetails(null);
                setRecognitionResult(null);
                setManualEntryMode(false);
                setManualName('');
                setManualDosage('');
                setManualFrequency('');
              }}
            >
              取消
            </Button>
            <Button 
              onPress={saveMedicine} 
              mode="contained"
              disabled={!((recognitionResult && recognitionResult.name) || (manualEntryMode && manualName))}
            >
              {editingMedicine ? '更新' : '保存'}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* 错误提示对话框 */}
        <Dialog
          visible={errorDialogVisible}
          onDismiss={() => setErrorDialogVisible(false)}
        >
          <Dialog.Title>提示</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{errorMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setErrorDialogVisible(false);
                // 在识别失败时，允许用户直接进入手动录入
                setManualEntryMode(true);
                setManualDosage('每次1片');
                setManualFrequency('每日2次');
              }}
            >
              手动录入
            </Button>
            <Button onPress={() => setErrorDialogVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>

        {/* 药品详情对话框 */}
        <Dialog
          visible={detailsDialogVisible}
          onDismiss={() => setDetailsDialogVisible(false)}
        >
          <Dialog.Title>药品详细信息</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.detailsScrollView}>
              {medicineDetails && (
                <>
                  {medicineDetails.name && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>药品名称：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.name}</Text>
                    </View>
                  )}
                  {medicineDetails.dosage && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>服用剂量：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.dosage}</Text>
                    </View>
                  )}
                  {medicineDetails.frequency && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>服用频率：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.frequency}</Text>
                    </View>
                  )}
                  {medicineDetails.specification && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>规格：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.specification}</Text>
                    </View>
                  )}
                  {medicineDetails.manufacturer && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>生产厂家：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.manufacturer}</Text>
                    </View>
                  )}
                  {medicineDetails.approvalNumber && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>批准文号：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.approvalNumber}</Text>
                    </View>
                  )}
                  {medicineDetails.indication && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>适应症：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.indication}</Text>
                    </View>
                  )}
                  {medicineDetails.usage && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>用法用量：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.usage}</Text>
                    </View>
                  )}
                  {medicineDetails.contraindication && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>禁忌：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.contraindication}</Text>
                    </View>
                  )}
                  {medicineDetails.sideEffects && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>不良反应：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.sideEffects}</Text>
                    </View>
                  )}
                  {medicineDetails.precautions && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>注意事项：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.precautions}</Text>
                    </View>
                  )}
                  {medicineDetails.interactions && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>药物相互作用：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.interactions}</Text>
                    </View>
                  )}
                  {medicineDetails.storage && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>贮藏：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.storage}</Text>
                    </View>
                  )}
                  {medicineDetails.description && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>说明书：</Text>
                      <Text style={styles.detailValue}>{medicineDetails.description}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDetailsDialogVisible(false)}>关闭</Button>
            {recognitionResult && recognitionResult.name && (
              <Button 
                onPress={() => {
                  setDetailsDialogVisible(false);
                  // 关闭详情对话框后，主对话框仍然打开，可以保存
                }} 
                mode="contained"
              >
                确定
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>

        {/* 提醒设置对话框 */}
        <Dialog visible={reminderSettingsVisible} onDismiss={() => setReminderSettingsVisible(false)}>
          <Dialog.Title>提醒设置</Dialog.Title>
          <Dialog.Content>
            <View style={styles.switchRow}>
              <Text>启用提醒</Text>
              <Switch value={reminderEnabled} onValueChange={setReminderEnabled} />
            </View>
            <View style={styles.switchRow}>
              <Text>暂停提醒</Text>
              <Switch value={reminderPaused} onValueChange={setReminderPaused} />
            </View>

            <TextInput
              label="每天提醒时间点（逗号分隔，如 08:00,14:00,20:00）"
              value={reminderTimesText}
              onChangeText={setReminderTimesText}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="疗程开始日期（YYYY-MM-DD，可空）"
              value={therapyStartDate}
              onChangeText={setTherapyStartDate}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="疗程结束日期（YYYY-MM-DD，可空）"
              value={therapyEndDate}
              onChangeText={setTherapyEndDate}
              mode="outlined"
              style={styles.input}
            />
            <Paragraph style={styles.hintText}>
              提示：保存后会重建未来提醒（最多生成未来30天或到疗程结束日）。Web 端系统通知能力受限，但应用内提醒/打卡仍可用。
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReminderSettingsVisible(false)}>取消</Button>
            <Button mode="contained" onPress={saveReminderSettings}>保存</Button>
          </Dialog.Actions>
        </Dialog>

        {/* 依从性统计对话框 */}
        <Dialog visible={statsVisible} onDismiss={() => setStatsVisible(false)}>
          <Dialog.Title>服药依从性统计</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={statsDays}
              onValueChange={async (v) => {
                setStatsDays(v);
                if (activeMedicineForSettings) {
                  const data = await MedicineService.getAdherenceStats(activeMedicineForSettings.id, Number(v));
                  setStatsData(data);
                }
              }}
              buttons={[
                { value: '7', label: '7天' },
                { value: '30', label: '30天' },
              ]}
              style={{ marginBottom: theme.spacing.md }}
            />

            {statsData ? (
              <>
                <Paragraph>计划次数：{statsData.scheduled}</Paragraph>
                <Paragraph>已服：{statsData.taken}　漏服：{statsData.missed}</Paragraph>
                <Paragraph>依从率：{Math.round(statsData.adherenceRate * 100)}%</Paragraph>
                <ProgressBar
                  progress={statsData.adherenceRate}
                  color={theme.colors.primary}
                  style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}
                />
                <Button
                  mode="outlined"
                  icon="download"
                  onPress={async () => {
                    try {
                      const result = await ExportService.exportIntakeLogs('csv');
                      if (result.success) Alert.alert('成功', result.message || '服药记录已导出');
                    } catch (e) {
                      Alert.alert('失败', e.message || '导出失败');
                    }
                  }}
                >
                  导出服药记录
                </Button>
              </>
            ) : (
              <Paragraph>暂无数据</Paragraph>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatsVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  medicineCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 2,
  },
  imageScrollView: {
    maxHeight: 200,
  },
  medicineImage: {
    width: 400,
    height: 200,
    resizeMode: 'cover',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  medicineName: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  medicineActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
  medicineInfo: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  chip: {
    marginRight: theme.spacing.xs,
  },
  medicineDate: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  remindersContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.15)',
  },
  remindersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  remindersEmpty: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    minWidth: 54,
  },
  reminderStatusChip: {
    backgroundColor: theme.colors.surface,
  },
  reminderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginLeft: 'auto',
  },
  reminderActionButton: {
    borderRadius: theme.borderRadius.sm,
  },
  reminderFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  hintText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  previewScrollView: {
    marginBottom: theme.spacing.md,
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.sm,
  },
  recognizingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  recognizingText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary,
    fontSize: 14,
  },
  exportCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  exportButton: {
    borderRadius: theme.borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  addMoreButton: {
    marginBottom: theme.spacing.md,
  },
  ocrButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  manualEntryButton: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  manualFormContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.12)',
  },
  manualFormTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  dialogText: {
    marginBottom: theme.spacing.sm,
  },
  input: {
    marginBottom: theme.spacing.sm,
  },
  detailsButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  detailsScrollView: {
    maxHeight: 400,
  },
  detailItem: {
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  recognitionResultContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
  },
  recognitionResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  recognitionResultText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
});

