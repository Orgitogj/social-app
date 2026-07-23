import { useRouter } from "expo-router";
import { Text, View, Button } from "react-native";

const Index = () => {
  const router = useRouter();

  return (
    <Scree>
      <Text>Index</Text>

      <Button 
        title="welcome" 
        onPress={() => router.push('/welcome')} 
      />
    </Scree>
  );
};

export default Index;