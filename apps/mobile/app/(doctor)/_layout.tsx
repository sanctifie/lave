import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, typography } from '../../src/theme';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function DoctorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor:  colors.border,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { ...typography.small, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Consultations',
          tabBarIcon: ({ focused }) => <Icon emoji="🩺" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
