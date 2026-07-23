export const createOrUpdatePost =async (post)=>{
  try{

    if(post.file && typeof post.file=='object'){
      
    }

  }
  catch(error){
    console.log('Create post error',error);
    return{success:false,msg:'Could not create your post'};
  }
}