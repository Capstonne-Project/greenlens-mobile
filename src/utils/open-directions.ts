import { Linking, Platform } from 'react-native';

/** Mở chỉ đường tới toạ độ bằng app Google Maps (fallback trình duyệt nếu chưa cài). */
export async function openGoogleMapsDirections(
  latitude: number,
  longitude: number,
  label?: string | null,
): Promise<void> {
  const destination = `${latitude},${longitude}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  try {
    if (Platform.OS === 'ios') {
      const appUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      const supported = await Linking.canOpenURL(appUrl);
      await Linking.openURL(supported ? appUrl : webUrl);
      return;
    }

    if (Platform.OS === 'android') {
      const query = label ? `${destination}(${encodeURIComponent(label)})` : destination;
      const appUrl = `google.navigation:q=${query}`;
      const supported = await Linking.canOpenURL(appUrl);
      await Linking.openURL(supported ? appUrl : webUrl);
      return;
    }

    await Linking.openURL(webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}
