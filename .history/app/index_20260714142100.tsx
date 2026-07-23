import { useRouter } from "expo-router";
import { Text, View } from "react-native";

const index =()=>{
  const router=useRouter();

  return (
    <View>
    <Btton title="welcome" onPress={()=> router.push('welcome')}></Btton>
    </View>
  );
}

export default index