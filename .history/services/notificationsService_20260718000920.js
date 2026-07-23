
export const createNotifications = async (postLike) => {
  try {
    const { data, error } = await supabase
      .from('postLikes')
      .insert(postLike)
      .select()
      .single();

    if (error) {
      console.log('Post like error:', error);
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
    console.log('Post like error', error);
    return {
      success: false,
      msg: 'Could not like the post',
    };
  }
};
