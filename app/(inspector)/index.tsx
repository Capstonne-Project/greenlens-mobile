import { Redirect, type Href } from 'expo-router';

export default function InspectorIndexRedirect() {
  return <Redirect href={'/(inspector)/queue' as Href} />;
}
