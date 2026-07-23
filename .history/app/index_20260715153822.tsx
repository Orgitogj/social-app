import ScreenWrapper from "@/components/screenWrapper";
import { useRouter } from "expo-router";
import { Text, View, Button } from "react-native";
import Loading from "@/components/Loading";
const Index = () => {
  const router = useRouter();

  return (
   <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
    <Loading/>
    
    </View>
   
  )
}

export default Index;