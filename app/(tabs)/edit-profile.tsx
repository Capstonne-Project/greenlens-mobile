import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useEditProfile } from '@/hooks/useEditProfile';
import { colors } from '@/theme/colors';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { compressImage } from '@/utils/compress-image';

const MAX_FULL_NAME_LENGTH = 200;

export default function EditProfileScreen() {
  const { user, isSavingName, isUploadingAvatar, updateFullName, uploadAvatar } = useEditProfile();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [nameError, setNameError] = useState<string | null>(null);

  const hasNameChanged = fullName.trim() !== (user?.fullName ?? '').trim();

  const validateName = (value: string): string | null => {
    if (value.trim().length === 0) return 'Vui lòng nhập họ tên.';
    if (value.length > MAX_FULL_NAME_LENGTH) return `Họ tên tối đa ${MAX_FULL_NAME_LENGTH} ký tự.`;
    return null;
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Thiếu quyền thư viện', 'Vui lòng cho phép truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    try {
      // Nén + convert HEIC → JPEG; avatar chỉ cần ~512px là đủ nét.
      const compressed = await compressImage(asset.uri, {
        baseName: 'avatar',
        maxDimension: 512,
        quality: 0.8,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
      });
      await uploadAvatar({
        uri: compressed.uri,
        mimeType: compressed.mimeType,
        fileName: compressed.fileName,
      });
    } catch (err) {
      Alert.alert('Không thành công', getApiErrorMessage(err, 'Tải lên ảnh đại diện thất bại.'));
    }
  };

  const handleSave = async () => {
    const error = validateName(fullName);
    setNameError(error);
    if (error) return;

    if (!hasNameChanged) {
      router.replace('/(tabs)/profile' as Href);
      return;
    }

    try {
      await updateFullName(fullName.trim());
      router.replace('/(tabs)/profile' as Href);
      Alert.alert('Đã lưu', 'Cập nhật hồ sơ thành công.');
    } catch (err) {
      Alert.alert('Không thành công', getApiErrorMessage(err, 'Cập nhật hồ sơ thất bại.'));
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background">
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      className="px-6 pt-2"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => router.replace('/(tabs)/profile' as Href)}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-lg font-bold text-textPrimary">Chỉnh sửa hồ sơ</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="mt-6 items-center">
        <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar} className="relative">
          <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primaryLight">
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                onError={(e) => {
                  if (__DEV__) console.log('[edit-profile] Image load error:', e.error, user.avatarUrl);
                }}
              />
            ) : (
              <Text className="text-3xl font-bold text-primary">{fullName?.[0]?.toUpperCase() ?? 'H'}</Text>
            )}

            {isUploadingAvatar ? (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(150)}
                className="absolute inset-0 items-center justify-center bg-black/40"
              >
                <ActivityIndicator size="small" color={colors.white} />
              </Animated.View>
            ) : null}
          </View>
          <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary">
            <Ionicons name={isUploadingAvatar ? 'hourglass-outline' : 'camera'} size={14} color={colors.white} />
          </View>
        </Pressable>
        <Text className="mt-2 text-xs text-textSecondary">
          {isUploadingAvatar ? 'Đang tải ảnh lên…' : 'Chạm để đổi ảnh đại diện'}
        </Text>
      </View>

      <View className="mt-8 gap-4">
        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Họ và tên</Text>
          <Input
            value={fullName}
            onChangeText={(value) => {
              setFullName(value);
              if (nameError) setNameError(null);
            }}
            onBlur={() => setNameError(validateName(fullName))}
            placeholder="Nhập họ và tên"
            placeholderTextColor="#94A3B8"
            maxLength={MAX_FULL_NAME_LENGTH}
            className={`h-14 rounded-2xl border bg-white px-4 ${nameError ? 'border-error' : 'border-border'}`}
          />
          {nameError ? <Text className="text-xs text-error">{nameError}</Text> : null}
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Email</Text>
          <View className="h-14 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4">
            <Text className="flex-1 text-base text-textSecondary" numberOfLines={1}>
              {user?.email}
            </Text>
            {user?.isEmailVerified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-primaryLight px-2 py-1">
                <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} />
                <Text className="text-[10px] font-semibold text-primaryDark">Đã xác thực</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Số điện thoại</Text>
          <View className="flex-row items-center gap-2">
            <View className="h-14 flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4">
              <Text className="flex-1 text-base text-textSecondary" numberOfLines={1}>
                {user?.phoneNumber ?? 'Chưa cập nhật'}
              </Text>
              {user?.isPhoneVerified ? (
                <View className="flex-row items-center gap-1 rounded-full bg-primaryLight px-2 py-1">
                  <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} />
                  <Text className="text-[10px] font-semibold text-primaryDark">Đã xác thực</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => Alert.alert('Đổi số điện thoại', 'Tính năng đang được phát triển.')}
              className="h-14 items-center justify-center rounded-2xl border border-border px-4"
            >
              <Text className="text-sm font-semibold text-primary">Đổi số</Text>
            </Pressable>
          </View>
        </View>

        <Button className="mt-2 h-14 rounded-2xl" onPress={handleSave} disabled={isSavingName}>
          <Text className="font-semibold text-primary-foreground">Lưu thay đổi</Text>
        </Button>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeScreen>
  );
}
