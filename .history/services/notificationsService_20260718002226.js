import { supabase } from "../lib/supabase";


export const createNotification = async (notification) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.log('notification error:', error);
      return {
        success: false,
        msg: 'Something went wrong',
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.log('notification error', error);
    return {
      success: false,
      msg: 'Something went wrong',
    };
  }
};




export const fetchNotifications = async (receiverId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:senderId(id,name,image)
        user: users (id, name, image),
        postLikes (*),
        comments (
          id,
          text,
          created_at,
          userId,
          user: users (id, name, image)
        )
      `)
      .eq('recei', postId)
      .order('created_at', { ascending: false, foreignTable: 'comments' })
      .single();

    if (error) {
      console.log('fetchPostDetails error:', error);
      return { success: false, msg: 'Could not fetch the posts' };
    }

    return { success: true, data: data };
  } catch (error) {
    console.log('fetchPostDetails error', error);
    return { success: false, msg: 'Could not fetch the post' };
  }
};
