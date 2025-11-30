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
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { MedicineService } from '../services/MedicineService';

// Web平台不需要设置通知处理器
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function MedicineScreen() {
  const [medicines, setMedicines] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [sourceDialogVisible, setSourceDialogVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');

  useEffect(() => {
    loadMedicines();
    requestPermissions();
  }, []);

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
        
        // 使用第一张图片进行OCR识别
        if (selectedImages.length === 0 && result.assets[0].uri) {
          const recognizedData = await MedicineService.recognizeMedicine(result.assets[0].uri);
          setMedicineName(recognizedData.name || '');
          setDosage(recognizedData.dosage || '');
          setFrequency(recognizedData.frequency || '');
        }
        
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
        
        // 使用第一张图片进行OCR识别
        if (selectedImages.length === 0 && result.assets[0].uri) {
          const recognizedData = await MedicineService.recognizeMedicine(result.assets[0].uri);
          setMedicineName(recognizedData.name || '');
          setDosage(recognizedData.dosage || '');
          setFrequency(recognizedData.frequency || '');
        }
        
        setDialogVisible(true);
      }
    } catch (error) {
      Alert.alert('错误', '选择图片失败，请重试');
      console.error('相册错误:', error);
    }
  };

  const saveMedicine = async () => {
    if (!medicineName || !dosage || !frequency) {
      Alert.alert('提示', '请填写完整的药品信息');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('提示', '请至少上传一张图片');
      return;
    }

    const medicine = {
      id: Date.now().toString(),
      name: medicineName,
      dosage,
      frequency,
      images: selectedImages, // 保存多张图片
      image: selectedImages[0], // 保留第一张作为主图（兼容旧数据）
      createdAt: new Date().toISOString(),
    };

    await MedicineService.saveMedicine(medicine);
    await MedicineService.scheduleReminders(medicine);
    
    setDialogVisible(false);
    setSourceDialogVisible(false);
    setSelectedImages([]);
    setMedicineName('');
    setDosage('');
    setFrequency('');
    
    loadMedicines();
    Alert.alert('成功', '药品已添加，提醒已设置');
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
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
                    <TouchableOpacity onPress={() => deleteMedicine(medicine.id)}>
                      <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
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
            setMedicineName('');
            setDosage('');
            setFrequency('');
          }}
        >
          <Dialog.Title>确认药品信息</Dialog.Title>
          <Dialog.Content>
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
            <TextInput
              label="药品名称"
              value={medicineName}
              onChangeText={setMedicineName}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="服用剂量"
              value={dosage}
              onChangeText={setDosage}
              placeholder="例如：每次1片"
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="服用频率"
              value={frequency}
              onChangeText={setFrequency}
              placeholder="例如：每日2次"
              style={styles.input}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setDialogVisible(false);
                setSelectedImages([]);
                setMedicineName('');
                setDosage('');
                setFrequency('');
              }}
            >
              取消
            </Button>
            <Button onPress={saveMedicine} mode="contained">保存</Button>
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
  dialogText: {
    marginBottom: theme.spacing.sm,
  },
  input: {
    marginBottom: theme.spacing.sm,
  },
});

