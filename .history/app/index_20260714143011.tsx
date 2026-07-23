import ScreenWrapper from "@/components/screenWrapper";
import { useRouter } from "expo-router";
import { Text, View, Button } from "react-native";

const Index = () => {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <Text>Index</Text>

      <Button 
        title="welcome" 
        onPress={() => router.push('/welcome')} 
      />
    </ScreenWrapper>
  );
};

export default Index;