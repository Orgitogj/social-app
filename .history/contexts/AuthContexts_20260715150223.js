import { createContext, useState } from "react" ;
import { Value } from "react-native/types_generated/Libraries/Animated/AnimatedExports";

const AuthContext=createContext();

export const AuthProvider=({children})=>{

  const [user,setUser]=useState(null);

  const setAuth=authUser=>{
    setUser(authUser);
  }
  const setUserData=userData=>{
    setUser({...userData});

  }

  return(
    <AuthContext.Provider value={{user,setAuth,setUserData}}>

      {children}
    </AuthContext.Provider>
  )
}



export const useAuth=()=>useCon