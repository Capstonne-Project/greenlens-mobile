import { UserAvatar } from '@/components/common/UserAvatar';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { CommentThread, ReportCommentItem } from '@/types/comment.types';
import { formatRelativeTime } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Damping cao để nút co lại rồi dừng hẳn, không dao động qua lại. */
const PRESS_SPRING = { damping: 18, stiffness: 280 };

interface ReportCommentsSectionProps {
  threads: CommentThread[];
  isLoading: boolean;
  isSubmitting: boolean;
  likingCommentId?: string | null;
  errorMessage: string | null;
  composerLabel?: string;
  composerPlaceholder?: string;
  emptyLabel?: string;
  onSubmit: (content: string, parentCommentId?: string | null) => Promise<boolean>;
  onToggleLike: (commentId: string) => Promise<boolean>;
  onRetry?: () => void;
  /** Mở hồ sơ công khai tác giả bình luận — bỏ qua với bình luận của đội xử lý */
  onOpenUserProfile?: (userId: string) => void;
}

const TEAM_DISPLAY_NAME = 'Đội xử lý';

/** Avatar trong composer — người đang soạn không có avatarUrl trong context này. */
function CommentAvatar({
  name,
  isTeam = false,
  size = 36,
}: {
  name: string;
  isTeam?: boolean;
  size?: number;
}) {
  return <UserAvatar name={name} isTeam={isTeam} size={size} />;
}

interface ActionChipProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionChip({
  label,
  icon,
  active = false,
  activeColor = colors.primary,
  onPress,
  disabled,
}: ActionChipProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = active ? activeColor : colors.textSecondary;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        onPressIn={() => {
          scale.value = withSpring(0.9, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        className="flex-row items-center gap-1 py-1 pr-2"
      >
        <Ionicons name={icon} size={14} color={color} />
        <Text className="text-[12px] font-semibold" style={{ color }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

interface CommentBubbleProps {
  item: ReportCommentItem;
  isReply?: boolean;
  onReply: (item: ReportCommentItem) => void;
  onLike: (commentId: string) => void;
  likeBusy?: boolean;
  onOpenProfile?: (userId: string) => void;
}

function CommentBubble({
  item,
  isReply = false,
  onReply,
  onLike,
  likeBusy,
  onOpenProfile,
}: CommentBubbleProps) {
  const isTeam = item.authorName === TEAM_DISPLAY_NAME;
  const displayName = item.authorName || 'Người dùng';
  const likeLabel = item.likeCount > 0 ? String(item.likeCount) : 'Thích';

  // Đội xử lý hiện nhãn chung — không có hồ sơ cá nhân để mở.
  const canOpenProfile = Boolean(onOpenProfile) && !isTeam && Boolean(item.authorId);
  const openProfile = () => {
    if (!canOpenProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenProfile!(item.authorId);
  };

  return (
    <View className={`flex-row gap-2.5 py-2 ${isReply ? 'pl-10' : 'px-1'}`}>
      <Pressable onPress={openProfile} disabled={!canOpenProfile} hitSlop={4}>
        <UserAvatar
          name={displayName}
          avatarUrl={item.authorAvatarUrl}
          isTeam={isTeam}
          size={isReply ? 28 : 36}
        />
      </Pressable>

      <View className="min-w-0 flex-1">
        <View className="mb-0.5 flex-row flex-wrap items-center gap-1.5">
          <Pressable onPress={openProfile} disabled={!canOpenProfile} hitSlop={4}>
            <Text className="text-[13px] font-semibold text-textPrimary" numberOfLines={1}>
              {displayName}
            </Text>
          </Pressable>
          {isTeam ? (
            <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: '#D1FAE5' }}>
              <Text className="text-[10px] font-bold" style={{ color: '#065F46' }}>
                Đội ngũ
              </Text>
            </View>
          ) : null}
        </View>

        <View
          className="self-start rounded-2xl px-3 py-2"
          style={{
            backgroundColor: isTeam ? '#ECFDF5' : '#F3F4F6',
            borderTopLeftRadius: 4,
            maxWidth: '100%',
          }}
        >
          <Text className="text-[14px] leading-5 text-textPrimary">{item.content}</Text>
        </View>

        <View className="mt-0.5 flex-row flex-wrap items-center gap-1">
          <Text className="mr-2 text-[11px] text-textSecondary">
            {formatRelativeTime(item.createdAt)}
          </Text>
          <ActionChip label="Trả lời" icon="chatbubble-outline" onPress={() => onReply(item)} />
          <ActionChip
            label={likeLabel}
            icon={item.likedByMe ? 'heart' : 'heart-outline'}
            active={item.likedByMe}
            activeColor="#EF4444"
            disabled={likeBusy}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onLike(item.id);
            }}
          />
        </View>
      </View>
    </View>
  );
}

function CommentsSkeleton() {
  return (
    <View className="gap-3 py-1">
      {[0, 1, 2].map((i) => (
        <View key={`sk-${i}`} className="flex-row gap-2.5 px-1">
          <View className="h-9 w-9 rounded-full bg-surface" />
          <View className="flex-1 gap-1.5 pt-0.5">
            <View className="h-3 w-24 rounded bg-border" />
            <View className="h-10 w-4/5 rounded-2xl bg-surface" />
            <View className="h-2.5 w-28 rounded bg-border" />
          </View>
        </View>
      ))}
    </View>
  );
}

interface ComposerSheetProps {
  visible: boolean;
  value: string;
  loading: boolean;
  replyTo: ReportCommentItem | null;
  placeholder: string;
  title: string;
  avatarLabel: string;
  isTeamComposer: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onClearReply: () => void;
}

function ComposerSheet({
  visible,
  value,
  loading,
  replyTo,
  placeholder,
  title,
  avatarLabel,
  isTeamComposer,
  onChange,
  onSubmit,
  onClose,
  onClearReply,
}: ComposerSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInputType>(null);
  const sendScale = useSharedValue(1);
  const sheetY = useSharedValue(480);
  const backdrop = useSharedValue(0);
  const [rendered, setRendered] = useState(visible);
  const canSend = value.trim().length > 0 && !loading;

  const sendAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  useEffect(() => {
    if (visible) {
      setRendered(true);
      sheetY.value = 520;
      backdrop.value = 0;
      sheetY.value = withSpring(0, {
        damping: 22,
        stiffness: 240,
        mass: 0.9,
        overshootClamping: false,
      });
      backdrop.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const timer = setTimeout(() => inputRef.current?.focus(), 340);
      return () => clearTimeout(timer);
    }

    // Đóng: animate rồi mới unmount
    sheetY.value = withTiming(
      540,
      { duration: 250, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setRendered)(false);
      },
    );
    backdrop.value = withTiming(0, {
      duration: 220,
      easing: Easing.in(Easing.quad),
    });
  }, [visible, sheetY, backdrop]);

  if (!rendered) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            pointerEvents="box-none"
            style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropAnimStyle]}
          >
            <Pressable
              className="flex-1"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onPress={onClose}
            />
          </Animated.View>

          <Animated.View
            className="rounded-t-3xl bg-white"
            style={[
              sheetAnimStyle,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                maxHeight: '72%',
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
                elevation: 12,
              },
            ]}
          >
            <View className="items-center pt-2.5 pb-1">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>

            <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
              <Text className="text-base font-bold text-textPrimary">{title}</Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}
            >
              {replyTo ? (
                <View className="mb-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-textSecondary">
                      Trả lời @{replyTo.authorName || 'người dùng'}
                    </Text>
                    <Pressable onPress={onClearReply} hitSlop={8}>
                      <Text className="text-xs font-semibold text-primary">Bỏ</Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm leading-5 text-textPrimary" numberOfLines={3}>
                    {replyTo.content}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-start gap-2.5">
                <CommentAvatar name={avatarLabel} isTeam={isTeamComposer} size={36} />
                <TextInput
                  ref={inputRef}
                  value={value}
                  onChangeText={onChange}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={500}
                  autoFocus={false}
                  className="min-h-[96px] flex-1 text-[15px] leading-6 text-textPrimary"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            </ScrollView>

            <View className="flex-row items-center justify-between border-t border-border px-4 pt-3">
              <Text className="text-[11px] text-textSecondary">{value.trim().length}/500</Text>

              <Animated.View style={sendAnimStyle}>
                <Pressable
                  onPress={onSubmit}
                  disabled={!canSend}
                  onPressIn={() => {
                    if (canSend) sendScale.value = withSpring(0.94, PRESS_SPRING);
                  }}
                  onPressOut={() => {
                    sendScale.value = withSpring(1, PRESS_SPRING);
                  }}
                  className="h-10 flex-row items-center gap-1.5 rounded-full px-4"
                  style={{ backgroundColor: canSend ? colors.primary : colors.border }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={15} color="#fff" />
                      <Text className="text-sm font-bold text-white">Gửi</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ReportCommentsSection({
  threads,
  isLoading,
  isSubmitting,
  likingCommentId = null,
  errorMessage,
  composerLabel = 'Bình luận',
  composerPlaceholder = 'Thêm bình luận…',
  emptyLabel = 'Chưa có bình luận nào. Hãy là người đầu tiên!',
  onSubmit,
  onToggleLike,
  onRetry,
  onOpenUserProfile,
}: ReportCommentsSectionProps) {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ReportCommentItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isTeamComposer = composerLabel.toLowerCase().includes('phản hồi');
  const totalCount = threads.reduce((sum, t) => sum + 1 + t.replies.length, 0);

  const openComposer = (target?: ReportCommentItem | null) => {
    setReplyTo(target ?? null);
    setSheetOpen(true);
  };

  const closeComposer = () => {
    setSheetOpen(false);
    setReplyTo(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting || draft.trim().length === 0) return;
    const parentId = replyTo?.parentCommentId ?? replyTo?.id ?? null;
    const ok = await onSubmit(draft, parentId);
    if (ok) {
      setDraft('');
      closeComposer();
    }
  };

  return (
    <View className="mb-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          {composerLabel}
        </Text>
        {!isLoading && totalCount > 0 ? (
          <Text className="text-xs text-textSecondary">{totalCount} bình luận</Text>
        ) : null}
      </View>

      {isLoading ? (
        <CommentsSkeleton />
      ) : threads.length === 0 ? (
        <View className="items-center px-4 py-6">
          <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-surface">
            <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} />
          </View>
          <Text className="text-center text-sm text-textSecondary">{emptyLabel}</Text>
        </View>
      ) : (
        <View>
          {threads.map((thread) => (
            <View key={thread.root.id}>
              <CommentBubble
                item={thread.root}
                onReply={(item) => openComposer(item)}
                onLike={(id) => void onToggleLike(id)}
                likeBusy={likingCommentId === thread.root.id}
                onOpenProfile={onOpenUserProfile}
              />
              {thread.replies.map((reply) => (
                <CommentBubble
                  key={reply.id}
                  item={reply}
                  isReply
                  onReply={(item) => openComposer(item)}
                  onLike={(id) => void onToggleLike(id)}
                  likeBusy={likingCommentId === reply.id}
                  onOpenProfile={onOpenUserProfile}
                />
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Trigger bar — mở sheet thay vì focus input inline */}
      <Pressable
        onPress={() => openComposer(null)}
        className="mt-2 flex-row items-center gap-2 border-t border-border pt-3"
      >
        <CommentAvatar
          name={isTeamComposer ? TEAM_DISPLAY_NAME : 'Bạn'}
          isTeam={isTeamComposer}
          size={32}
        />
        <View className="min-h-[40px] flex-1 justify-center rounded-full border border-border bg-surface px-4">
          <Text className="text-[14px] text-textSecondary">{composerPlaceholder}</Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="create-outline" size={16} color={colors.primary} />
        </View>
      </Pressable>

      {errorMessage ? (
        <View className="mt-2 rounded-xl bg-error/10 px-3 py-2.5">
          <Text className="text-sm text-error">{errorMessage}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} className="mt-1 self-start">
              <Text className="text-sm font-semibold text-primary">Thử lại</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ComposerSheet
        visible={sheetOpen}
        value={draft}
        loading={isSubmitting}
        replyTo={replyTo}
        placeholder={
          replyTo
            ? `Trả lời @${replyTo.authorName || 'người dùng'}…`
            : composerPlaceholder
        }
        title={replyTo ? 'Trả lời bình luận' : composerLabel}
        avatarLabel={isTeamComposer ? TEAM_DISPLAY_NAME : 'Bạn'}
        isTeamComposer={isTeamComposer}
        onChange={setDraft}
        onSubmit={() => void handleSubmit()}
        onClose={closeComposer}
        onClearReply={() => setReplyTo(null)}
      />
    </View>
  );
}
