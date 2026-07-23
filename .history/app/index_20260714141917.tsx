import { Text, View } from "react-native";

export default function Index() {
  return (
    <View>
    <Button title="welcome" onPress={()=> router.push('welcome')}></Button>
    </View>
  );
}
