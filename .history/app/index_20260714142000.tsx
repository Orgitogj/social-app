import { useRouter } from "expo-router";
import { Text, View } from "react-native";

const index =()=>{
  const router=useRouter
}
  return (
    <View>
    <Button title="welcome" onPress={()=> router.push('welcome')}></Button>
    </View>
  );
}
