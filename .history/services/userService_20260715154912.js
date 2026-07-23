import {supabase} from "../lib/supabase"


export const getUserData= async (userId)=>{
  try{
const {data,error}=await supabase.from('users').select().eq('id',userId).single

  } catch{
    console.log('got error:',error)=await supabase 
    return {success:false,msg:error.message}
  }
}