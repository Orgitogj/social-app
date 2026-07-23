import { Text, View } from "react-native";

const index =()=>
  return (
    <View>
    <Button title="welcome" onPress={()=> router.push('welcome')}></Button>
    </View>
  );
}
