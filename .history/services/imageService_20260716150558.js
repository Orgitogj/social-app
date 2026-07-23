import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

export const getUserImageSrc = (imagePath) => {
  if (imagePath) {
    return { uri: imagePath };
  } else {
    return require('../assets/images/defaultUser.png');
  }
};

export const uploadFile = async (folderName, fileUri, isImage = true) => {
  try {
    let fileName = getFilePath(folderName, isImage);
    console.log('STEP 1 - fileName:', fileName);
    console.log('STEP 1 - fileUri:', fileUri);

    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    console.log('STEP 2 - base64 u lexua, gjatesia:', fileBase64.length);

    let imageData = decode(fileBase64);
    console.log('STEP 3 - u decodua');

    let { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, imageData, {
        cacheControl: '3600',
        upsert: false,
        contentType: isImage ? 'image/*' : 'video/*',
      });

    if (error) {
      console.log('STEP 4 - GABIM NGA SUPABASE:', error.message);
      return { success: false, msg: error.message };
    }

    console.log('STEP 5 - SUKSES:', data.path);
    return { success: true, data: data.path };
  } catch (error) {
    console.log('GABIM I KAPUR (catch):', error.message);
    return { success: false, msg: error.message };
  }
};

export const getFilePath = (folderName, isImage) => {
  return `${folderName}/${new Date().getTime()}${isImage ? '.png' : '.mp4'}`;
};