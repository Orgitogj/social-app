import {uploadFile} from "./imageService";
import {supabase} from

export const createOrUpdatePost =async (post)=>{
  try{

    if(post.file && typeof post.file=='object'){
      let isImage=post?.file?.type=='image';
      let  folderName=isImage? 'postImages':'postVideos'

      let fileResult= await uploadFile(folderName,post?.file.uri,isImage)
      if (fileResult.success) post.file=fileResult.data;

        else{
           return fileResult;
        }
        }
  }

  const {data,error}=await supabase

  catch(error){
    console.log('Create post error',error);
    return{success:false,msg:'Could not create your post'};
  }
}