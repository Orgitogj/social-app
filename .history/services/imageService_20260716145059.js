import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export const getUserImageSrc = (imagePath) => {
  if (imagePath) {
    return { uri: imagePath };
  } else {
    return require('../assets/images/defaultUser.png');
  }
}


export const uploadFile=async(folderName,fileUri,isImage=true)=>{
  try{
let fileName=getFilePath(folderName ,isImage);
const fileBase64=await FileSystem.readAsStringAsync(FileUserIcon,{
  encoding:FileSystem.EncodingType.Base64
});

let imageData=decode(fileBase64);
let{data,error}=await supabase.storage.from('uploads').
  }
  catch(error){
    console.log('File upload error:',error)
    return{success:false,msg:'Could not upload meida'};

  }
}



export const getFilePath = (folderName, isImage) => {
  return `/${folderName}/${new Date().getTime()}${isImage ? '.png' : '.mp4'}`;
};




