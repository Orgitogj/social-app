
export const createNotification = async (notification) => {
  try {
    const { data, error } = await supabase
      .from('notification')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.log('notification error:', error);
      return {
        success: false,
        msg: 'Could not like the post',
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.log( error', error);
    return {
      success: false,
      msg: 'Could not like the post',
    };
  }
};
