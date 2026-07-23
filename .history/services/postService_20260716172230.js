export const createOrUpdatePost =async (post)=>{
  try{

    if(post.file && typeof post.file=='object'){
      let isImage=post?.file?.type=='image'
    }

  }
  catch(error){
    console.log('Create post error',error);
    return{success:false,msg:'Could not create your post'};
  }
}