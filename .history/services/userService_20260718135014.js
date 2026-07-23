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
      .from('users').update(data).eq('id',userId)

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


export const searchUsers = async (searchText, excludeUserId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, image')
      .ilike('name', `%${searchText}%`)
      .neq('id', excludeUserId)
      .limit(20);

    if (error) {
      console.log('searchUsers error:', error);
      return { success: false, msg: 'Nuk mund të kryhet kërkimi' };
    }
    return { success: true, data };
  } catch (error) {
    console.log('searchUsers error:', error);
    return { success: false, msg: error.message };
  }
};