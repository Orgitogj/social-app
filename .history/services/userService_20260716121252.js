import {supabase} from "../lib/supabase"
export const getUserData = async (userId)=>{
  try{

    console.log("Getting user with id:", userId);

    const {data,error}=await supabase
      .from('users')
      .select()
      .eq('id',userId)
      .single();

    console.log("Supabase response:", {data,error});

    if (error){
      return {success:false,msg:error?.message};
    }

    return {success:true,data}

  } 
  catch(error)
  {
    console.log('got error:',error);
    return {success:false,msg:error.message}
  }
}


export const updateUser = async (userId,data)=>{
  try{

    console.log("Getting user with id:", userId);

    const {error}=await supabase
      .from('users').update(data)

    console.log("Supabase response:", {data,error});

    if (error){
      return {success:false,msg:error?.message};
    }

    return {success:true,data}

  } 
  catch(error)
  {
    console.log('got error:',error);
    return {success:false,msg:error.message}
  }
}