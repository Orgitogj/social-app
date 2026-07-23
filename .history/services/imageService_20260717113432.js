import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { supabaseUrl } from '@/constants';

export const getUserImageSrc = (imagePath) => {
  if (imagePath) {
    return { uri: imagePath };
  } else {
    return require('../assets/images/defaultUser.png');
  }
};

export const getSupabaseFileUrl = (filePath) => {
  if (!filePath) return null;

  if (filePath.startsWith('http')) {
    return { uri: filePath };
  }

  return { uri: `${supabaseUrl}/storage/v1/object/public/uploads/${filePath}` };
};

export const uploadFile = async (folderName, fileUri, isImage = true) => {
  try {
    let fileName = getFilePath(folderName, isImage);

    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    let imageData = decode(fileBase64);

    let { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, imageData, {
        cacheControl: '3600',
        upsert: false,
        contentType: isImage ? 'image/png' : 'video/mp4',
      });

    if (error) {
      console.log('Supabase upload error:', error.message);
      return { success: false, msg: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(data.path);

    return { success: true, data: publicUrlData.publicUrl };
  } catch (error) {
    console.log('Caught error:', error.message);
    return { success: false, msg: error.message };
  }
};

export const getFilePath = (folderName, isImage) => {
  return `${folderName}/${new Date().getTime()}${isImage ? '.png' : '.mp4'}`;
};




export const getLocalfilePath=filePath=>{
  let fileName=filePath.
}
export const downloadFile=async(url)=>{
  try{



const {uri}=await FileSystem.downloadAsync(url,getLocalfilePath(url))
  }
  catch(error){
 return null;
  }
}