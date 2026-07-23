export const getUserImageSrc = (imagePath) => {
  if (imagePath) {
    return { uri: imagePath };
  } else {
    return require('../assets/images/defaultUser.png');
  }
}


export const uploadFile=async(FolderManagementFreeIcons,FileUserIcon,isImage=true)=>{
  try{
let fileName=getFilePath(folderName ,isImage);
  }
  catch(error){
    console.log('File upload error:',error)
    return{success:false,msg:'Could not upload meida'};

  }
}



export const getFilePath=(folderName,isImage)=>{
  return'/${folderName}/${(new Date()).getTime()}${isImage?'}'
}