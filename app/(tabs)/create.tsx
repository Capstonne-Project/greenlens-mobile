import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback } from 'react';

export default function CreateReportScreen() {
  useFocusEffect(
    useCallback(() => {
      router.replace('/report/create' as Href);
    }, []),
  );

  return null;
}
