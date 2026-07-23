import { useRouter } from "expo-router";
import { Text, View } from "react-native";

const index =()=>{
  const router=useRouter();

  return (
    <View>
    <Bu title="welcome" onPress={()=> router.push('welcome')}/>
    </View>
  );
}

export default index