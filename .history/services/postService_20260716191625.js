import { uploadFile } from "./imageService";
import { supabase } from "../lib/supabase";

export const createOrUpdatePost = async (post) => {
  try {

    if (post.file && typeof post.file == 'object') {
      let isImage = post.file.type == 'image';
      let folderName = isImage ? 'postImages' : 'postVideos';

      let fileResult = await uploadFile(folderName, post.file.uri, isImage);

      if (fileResult.success) {
        post.file = fileResult.data;
      } else {
        return fileResult;
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .upsert(post)
      .select()
      .single();

    if (error) {
      console.log(error);
      return {
        success: false,
        msg: error.message,
      };
    }

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.log('Create post error', error);
    return {
      success: false,
      msg: 'Could not create your post',
    };
  }
}
export const fetchPosts = async (limit=10) => {
  try {
    const {data,error}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(limit);
    if(error){
      console.log('FetchPosts error:',error);
      
    }

  } catch (error) {
    console.log('Fetch post error', error);
    return {
      success: false,
      msg: 'Could not fetch your post',
    };
  }
}