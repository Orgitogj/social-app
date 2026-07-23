import { useRouter } from "expo-router";
import { Text, View } from "react-native";

const index =()=>{
  const router=useRouter();

  return (
    <View>
    <B title="welcome" onPress={()=> router.push('welcome')}></B>
    </View>
  );
}

export default index