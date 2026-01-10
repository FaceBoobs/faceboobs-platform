// src/services/supabaseService.js
import { supabase } from '../supabaseClient';

export class SupabaseService {
  // Posts
  static async createPost(postData) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPosts(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get a single post by ID
  static async getPostById(postId) {
    try {
      console.log('🔍 Fetching single post:', postId);

      // Step 1: Fetch the post
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { success: false, error: 'Post not found' };
      }

      // Step 2: Fetch user data if creator_address exists
      if (data.creator_address) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, avatar_url, wallet_address')
          .eq('wallet_address', data.creator_address)
          .maybeSingle();

        if (!userError && userData) {
          data.username = userData.username;
          data.avatar_url = userData.avatar_url;
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPostsByCreator(creatorAddress, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('creator_address', creatorAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching posts by creator:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPostsByCreators(creatorAddresses, limit = 50) {
    try {
      console.log('🔍 Fetching posts from creators:', creatorAddresses);

      if (!creatorAddresses || creatorAddresses.length === 0) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('creator_address', creatorAddresses)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Found', data.length, 'posts from followed creators');
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching posts by creators:', error);
      return { success: false, error: error.message };
    }
  }

  static async deletePost(postId, userAddress) {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('creator_address', userAddress);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: error.message };
    }
  }

  static async updatePost(postId, updates) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating post:', error);
      return { success: false, error: error.message };
    }
  }

  // Stories
  static async createStory(storyData) {
    try {
      const { data, error } = await supabase
        .from('stories')
        .insert([storyData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating story:', error);
      return { success: false, error: error.message };
    }
  }

  static async getActiveStories() {
    try {
      // First cleanup expired stories
      await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Then fetch active stories
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching stories:', error);
      return { success: false, error: error.message };
    }
  }

  // Get stories only from users that the current user follows
  static async getFollowingStories(userAddress) {
    try {
      // First cleanup expired stories
      await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Get list of users the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('followed_address')
        .eq('follower_address', userAddress);

      if (followingError) throw followingError;

      // Extract addresses of followed users
      const followingAddresses = followingData?.map(f => f.followed_address) || [];

      // If not following anyone, return empty array
      if (followingAddresses.length === 0) {
        return { success: true, data: [], noFollows: true };
      }

      // Fetch active stories only from followed users
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .in('creator_address', followingAddresses)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching following stories:', error);
      return { success: false, error: error.message };
    }
  }

  // Likes
  static async toggleLike(postId, userAddress, username = null, avatarUrl = null) {
    try {
      // Check if like exists
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_address', userAddress)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLike) {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_address', userAddress);

        if (error) throw error;
        return { success: true, action: 'unliked' };
      } else {
        // Add like
        const { error } = await supabase
          .from('likes')
          .insert([{
            post_id: postId,
            user_address: userAddress
          }]);

        if (error) throw error;

        // Create notification for post owner
        const { data: post } = await supabase
          .from('posts')
          .select('creator_address, username')
          .eq('id', postId)
          .single();

        if (post && post.creator_address !== userAddress) {
          await this.createNotification({
            user_address: post.creator_address,
            type: 'like',
            title: 'New Like',
            message: `${username || userAddress.substring(0, 8)} liked your post`,
            post_id: postId,
            from_user_address: userAddress,
            from_username: username,
            from_avatar_url: avatarUrl
          });
        }

        return { success: true, action: 'liked' };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLikesForPost(postId) {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('user_address')
        .eq('post_id', postId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching likes:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserLikes(userAddress) {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true, data: data.map(like => like.post_id) };
    } catch (error) {
      console.error('Error fetching user likes:', error);
      return { success: false, error: error.message };
    }
  }

  // Comments
  static async createComment(commentData) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (error) throw error;

      // Create notification for post owner
      const { data: post } = await supabase
        .from('posts')
        .select('creator_address, username')
        .eq('id', commentData.post_id)
        .single();

      if (post && post.creator_address !== commentData.user_address) {
        await this.createNotification({
          user_address: post.creator_address,
          type: 'comment',
          title: 'New Comment',
          message: `${commentData.username || commentData.user_address.substring(0, 8)} commented on your post`,
          post_id: commentData.post_id,
          from_user_address: commentData.user_address,
          from_username: commentData.username,
          from_avatar_url: commentData.avatar || null
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating comment:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCommentsForPost(postId) {
    try {
      console.log('🔍 Fetching comments for post:', postId);

      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('📦 Fetched comments data:', data);
      console.log('📊 Comment fields:', data.length > 0 ? Object.keys(data[0]) : 'No comments');

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteComment(commentId, userAddress) {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }
  }

  // Notifications
  static async createNotification(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  static async getNotifications(userAddress, limit = 50) {
    try {
      // Step 1: Fetch notifications
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        return { success: true, data: [] };
      }

      // Step 2: Get unique user addresses and post IDs
      const actorAddresses = [...new Set(notifications.map(n => n.from_user_address).filter(Boolean))];

      // Filter and clean post IDs: RIGOROUS validation for only valid integer IDs
      const postIds = notifications.map(n => {
        const id = Number(n.post_id);
        return (!isNaN(id) && Number.isInteger(id) && id > 0) ? id : null;
      }).filter(id => id !== null);

      // Remove duplicates
      const uniquePostIds = [...new Set(postIds)];

      // Check if there are any valid post IDs before querying
      if (uniquePostIds.length === 0) {
        console.log('⚠️ No valid post IDs');
        // Return notifications with empty postsMap
        const enrichedNotifications = notifications.map(notification => ({
          ...notification,
          from_username: 'Unknown User',
          from_avatar_url: null,
          post: null
        }));
        return { success: true, data: enrichedNotifications };
      }

      console.log('✅ Valid PostIds:', uniquePostIds);
      console.log('✅ Valid PostIds to fetch:', uniquePostIds, 'Types:', uniquePostIds.map(id => typeof id));

      // Step 3: Fetch users data
      let usersMap = {};
      if (actorAddresses.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('wallet_address, username, avatar_url')
          .in('wallet_address', actorAddresses);

        if (!usersError && users) {
          usersMap = users.reduce((acc, user) => {
            acc[user.wallet_address] = user;
            return acc;
          }, {});
        }
      }

      // Step 4: Fetch posts data
      let postsMap = {};
      if (uniquePostIds.length > 0) {
        console.log('📡 [getNotifications] Fetching posts with IDs:', uniquePostIds);
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('id, media_url')
          .in('id', uniquePostIds);

        if (postsError) {
          console.error('❌ [getNotifications] Error fetching posts:', postsError);
          console.error('❌ [getNotifications] PostIds that caused error:', uniquePostIds);
        }

        if (!postsError && posts) {
          console.log('✅ [getNotifications] Fetched posts:', posts.length);
          postsMap = posts.reduce((acc, post) => {
            acc[post.id] = post;
            return acc;
          }, {});
        }
      } else {
        console.log('ℹ️ [getNotifications] No post IDs to fetch');
      }

      // Step 5: Enrich notifications with user and post data
      const enrichedNotifications = notifications.map(notification => ({
        ...notification,
        from_username: usersMap[notification.from_user_address]?.username || 'Unknown User',
        from_avatar_url: usersMap[notification.from_user_address]?.avatar_url || null,
        post: notification.post_id ? postsMap[notification.post_id] : null
      }));

      return { success: true, data: enrichedNotifications };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message };
    }
  }

  static async markNotificationAsRead(notificationId, userAddress) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  static async markAllNotificationsAsRead(userAddress) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_address', userAddress)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Users
  static async createUser(userData) {
    try {
      console.log('🔄 Inserting user into Supabase...');
      console.log('📊 Data to insert:', userData);

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        throw error;
      }

      console.log('✅ Supabase insert successful');
      console.log('✅ Inserted data:', data);

      return { success: true, data };
    } catch (error) {
      console.error('❌ Error creating user:', error);
      return { success: false, error: error.message, details: error };
    }
  }

  static async createOrUpdateUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert([userData], { onConflict: 'wallet_address' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUser(address) {
    try {
      console.log('🔍 [SupabaseService.getUser] Querying for address:', address);
      console.log('   - Normalized (lowercase):', address?.toLowerCase());

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address?.toLowerCase()) // SEMPRE usa toLowerCase
        .single();

      console.log('📬 [SupabaseService.getUser] Query result:', {
        found: !!data,
        error: error?.code,
        errorMessage: error?.message
      });

      // PGRST116 = "not found" - non è un errore critico
      if (error && error.code !== 'PGRST116') {
        console.error('❌ [SupabaseService.getUser] Critical error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ [SupabaseService.getUser] User found:', data.username);
      } else {
        console.log('⚠️ [SupabaseService.getUser] User not found');
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ [SupabaseService.getUser] Error fetching user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllUsers(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { success: false, error: error.message };
    }
  }

  // Follows
  static async followUser(followerAddress, followedAddress) {
    console.log('');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    console.log('🔵 SupabaseService.followUser CHIAMATA');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');

    try {
      console.log('📊 Parametri:');
      console.log('   - followerAddress:', followerAddress);
      console.log('   - followedAddress:', followedAddress);
      console.log('   - followerLowercase:', followerAddress.toLowerCase());
      console.log('   - followedLowercase:', followedAddress.toLowerCase());

      // Check if already following
      console.log('🔍 STEP 1: Controllo se già seguito...');
      const { data: existingFollow, error: checkError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_address', followerAddress.toLowerCase())
        .eq('followed_address', followedAddress.toLowerCase())
        .single();

      console.log('📬 Risultato controllo esistente:');
      console.log('   - data:', existingFollow);
      console.log('   - error:', checkError);
      console.log('   - errorCode:', checkError?.code);

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ ERRORE nel controllo follow esistente:', checkError);
        throw checkError;
      }

      if (existingFollow) {
        console.log('⚠️ Already following this user');
        console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
        return { success: true, action: 'already_following' };
      }

      console.log('✅ Non ancora seguito, procedo con INSERT');

      // Insert follow relationship
      console.log('🔍 STEP 2: INSERT nella tabella follows...');
      console.log('📝 Dati da inserire:', {
        follower_address: followerAddress.toLowerCase(),
        followed_address: followedAddress.toLowerCase()
      });

      const { data: insertData, error: insertError } = await supabase
        .from('follows')
        .insert([{
          follower_address: followerAddress.toLowerCase(),
          followed_address: followedAddress.toLowerCase()
        }])
        .select(); // Aggiungo .select() per vedere i dati inseriti

      console.log('📬 Risultato INSERT:');
      console.log('   - data:', insertData);
      console.log('   - error:', insertError);

      if (insertError) {
        console.error('❌ ERRORE INSERT:', insertError);
        console.error('   - Message:', insertError.message);
        console.error('   - Code:', insertError.code);
        console.error('   - Details:', insertError.details);
        console.error('   - Hint:', insertError.hint);
        throw insertError;
      }

      console.log('✅ INSERT riuscito!');

      // Update follow counts using the new centralized function
      console.log('🔍 STEP 3: Aggiorno contatori follow...');
      const countsResult = await this.updateFollowCounts(followerAddress, followedAddress);

      if (!countsResult.success) {
        console.warn('⚠️ Failed to update counts, but follow was successful');
      }

      console.log('✅ Successfully followed user');
      console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
      return { success: true, action: 'followed', data: insertData };
    } catch (error) {
      console.error('❌ ERRORE CATCH in SupabaseService.followUser:');
      console.error('   - Message:', error.message);
      console.error('   - Code:', error.code);
      console.error('   - Details:', error.details);
      console.error('   - Hint:', error.hint);
      console.error('   - Stack:', error.stack);
      console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
      return { success: false, error: error.message };
    }
  }

  static async unfollowUser(followerAddress, followedAddress) {
    try {
      console.log('🔄 Unfollowing user:', followerAddress, '-x->', followedAddress);

      // Delete follow relationship
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_address', followerAddress.toLowerCase())
        .eq('followed_address', followedAddress.toLowerCase());

      if (deleteError) throw deleteError;

      console.log('✅ DELETE successful');

      // Update follow counts using the new centralized function
      console.log('🔍 Updating follow counts...');
      const countsResult = await this.updateFollowCounts(followerAddress, followedAddress);

      if (!countsResult.success) {
        console.warn('⚠️ Failed to update counts, but unfollow was successful');
      }

      console.log('✅ Successfully unfollowed user');
      return { success: true, action: 'unfollowed' };
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      return { success: false, error: error.message };
    }
  }

  static async isFollowing(followerAddress, followedAddress) {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_address', followerAddress)
        .eq('followed_address', followedAddress)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { success: true, isFollowing: !!data };
    } catch (error) {
      console.error('❌ Error checking follow status:', error);
      return { success: false, error: error.message };
    }
  }

  static async getFollowers(userAddress) {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_address')
        .eq('followed_address', userAddress);

      if (error) throw error;
      return { success: true, data: data.map(f => f.follower_address) };
    } catch (error) {
      console.error('❌ Error fetching followers:', error);
      return { success: false, error: error.message };
    }
  }

  static async getFollowing(userAddress) {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('followed_address')
        .eq('follower_address', userAddress);

      if (error) throw error;
      return { success: true, data: data.map(f => f.followed_address) };
    } catch (error) {
      console.error('❌ Error fetching following:', error);
      return { success: false, error: error.message };
    }
  }

  // Update follow counts for users after follow/unfollow
  static async updateFollowCounts(followerAddress, followedAddress) {
    try {
      console.log('🔄 [SupabaseService] Updating follow counts...');
      console.log('   - Follower:', followerAddress);
      console.log('   - Followed:', followedAddress);

      // Count followers of the followed user
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_address', followedAddress.toLowerCase());

      if (followersError) {
        console.error('❌ Error counting followers:', followersError);
        throw followersError;
      }

      // Count following of the follower user
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_address', followerAddress.toLowerCase());

      if (followingError) {
        console.error('❌ Error counting following:', followingError);
        throw followingError;
      }

      console.log('📊 [SupabaseService] Counts calculated:', {
        followersCount: followersCount || 0,
        followingCount: followingCount || 0
      });

      // Update followers_count for followed user
      console.log('🔍 [SupabaseService] UPDATE 1: Updating followers_count for:', followedAddress.toLowerCase());
      console.log('   - Setting followers_count to:', followersCount || 0);

      const { data: followedUpdateData, error: updateFollowedError, count: followedUpdateCount } = await supabase
        .from('users')
        .update({ followers_count: followersCount || 0 })
        .eq('wallet_address', followedAddress.toLowerCase())
        .select(); // Add select() to see what was updated

      console.log('📬 [SupabaseService] UPDATE 1 Result:');
      console.log('   - Updated rows:', followedUpdateData?.length || 0);
      console.log('   - Data:', followedUpdateData);
      console.log('   - Error:', updateFollowedError);

      if (updateFollowedError) {
        console.error('❌ Error updating followed user count:', updateFollowedError);
        throw updateFollowedError;
      }

      if (!followedUpdateData || followedUpdateData.length === 0) {
        console.warn('⚠️ [SupabaseService] UPDATE 1: No rows updated for followed user!');
        console.warn('   - This means the user', followedAddress.toLowerCase(), 'does NOT exist in users table');
      }

      // Update following_count for follower user
      console.log('🔍 [SupabaseService] UPDATE 2: Updating following_count for:', followerAddress.toLowerCase());
      console.log('   - Setting following_count to:', followingCount || 0);

      const { data: followerUpdateData, error: updateFollowerError } = await supabase
        .from('users')
        .update({ following_count: followingCount || 0 })
        .eq('wallet_address', followerAddress.toLowerCase())
        .select(); // Add select() to see what was updated

      console.log('📬 [SupabaseService] UPDATE 2 Result:');
      console.log('   - Updated rows:', followerUpdateData?.length || 0);
      console.log('   - Data:', followerUpdateData);
      console.log('   - Error:', updateFollowerError);

      if (updateFollowerError) {
        console.error('❌ Error updating follower user count:', updateFollowerError);
        throw updateFollowerError;
      }

      if (!followerUpdateData || followerUpdateData.length === 0) {
        console.warn('⚠️ [SupabaseService] UPDATE 2: No rows updated for follower user!');
        console.warn('   - This means the user', followerAddress.toLowerCase(), 'does NOT exist in users table');
      }

      console.log('✅ [SupabaseService] Follow counts updated successfully');
      return {
        success: true,
        counts: {
          followersCount: followersCount || 0,
          followingCount: followingCount || 0
        }
      };
    } catch (error) {
      console.error('❌ [SupabaseService] Error updating follow counts:', error);
      return { success: false, error: error.message };
    }
  }

  // Purchases
  static async createPurchase(purchaseData) {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert([purchaseData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating purchase:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserPurchases(userAddress) {
    try {
      console.log('🛒 Fetching purchases for user:', userAddress);

      // Step 1: Get all purchases for the user
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_address', userAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!purchases || purchases.length === 0) {
        console.log('No purchases found for user');
        return { success: true, data: [] };
      }

      console.log(`📦 Found ${purchases.length} purchases, loading post details...`);

      // Step 2: Load post details for each purchase
      const enrichedPurchases = [];

      for (const purchase of purchases) {
        try {
          // Load post details
          const postResult = await this.getPostById(purchase.post_id);

          if (postResult.success && postResult.data) {
            // Combine purchase and post data
            enrichedPurchases.push({
              // Purchase details
              id: purchase.id,
              user_address: purchase.user_address,
              post_id: purchase.post_id,
              amount: purchase.amount,
              transaction_hash: purchase.transaction_hash,
              created_at: purchase.created_at,
              // Post details
              post: postResult.data,
              // Convenience fields for backward compatibility
              blockchain_content_id: postResult.data.blockchain_content_id
            });
          } else {
            // Post was deleted or not found, skip this purchase
            console.log(`⚠️ Post ${purchase.post_id} not found, skipping purchase ${purchase.id}`);
          }
        } catch (postError) {
          // Error loading individual post, skip but continue with others
          console.error(`❌ Error loading post ${purchase.post_id}:`, postError);
        }
      }

      console.log(`✅ Loaded ${enrichedPurchases.length} purchases with valid post details`);
      return { success: true, data: enrichedPurchases };
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCreatorPurchases(creatorAddress) {
    try {
      // Step 1: Get all posts created by this creator
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('creator_address', creatorAddress.toLowerCase());

      if (postsError) throw postsError;

      // If no posts, return empty array
      if (!posts || posts.length === 0) {
        return { success: true, data: [] };
      }

      const postIds = posts.map(p => p.id);

      // Step 2: Get all purchases of these posts
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching creator purchases:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkContentAccess(userAddress, postId) {
    try {
      // Check if post is free
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('is_paid, creator_address')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // If it's the owner's post or it's free, they have access
      if (post.creator_address === userAddress || !post.is_paid) {
        return { success: true, hasAccess: true };
      }

      // Check if they purchased it
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_address', userAddress)
        .eq('post_id', postId)
        .single();

      if (purchaseError && purchaseError.code !== 'PGRST116') throw purchaseError;

      return { success: true, hasAccess: !!purchase };
    } catch (error) {
      console.error('Error checking content access:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility functions
  static async cleanup() {
    try {
      // Remove expired stories
      await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return { success: true };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions
  static subscribeToLikes(postId, callback) {
    return supabase
      .channel(`likes-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `post_id=eq.${postId}`
      }, callback)
      .subscribe();
  }

  static subscribeToComments(postId, callback) {
    return supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, callback)
      .subscribe();
  }

  static subscribeToNotifications(userAddress, callback) {
    try {
      const channel = supabase.channel(`notifications-${userAddress}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_address=eq.${userAddress}`
        }, callback)
        .subscribe();

      return channel;
    } catch (error) {
      console.error('❌ Error creating notification subscription:', error);
      // Return a dummy object to prevent crashes
      return {
        unsubscribe: () => console.log('Dummy unsubscribe called')
      };
    }
  }

  // Messages - Build conversations dynamically from messages table
  static async getConversations(userAddress) {
    try {
      console.log('🔄 Loading conversations for user:', userAddress);

      if (!userAddress) {
        throw new Error('User address is required');
      }

      // Fetch all messages where user is sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_address.eq.${userAddress},receiver_address.eq.${userAddress}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded messages for building conversations:', data?.length || 0, 'messages');
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      console.error('❌ Full error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  }

  static async sendMessage(messageData) {
    try {
      console.log('🔄 Sending message:', messageData);
      console.log('🔍 Message data fields:', Object.keys(messageData));

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_address: messageData.sender_address,
          receiver_address: messageData.receiver_address,
          content: messageData.content,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Message sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Full error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  }

  static async getMessages(userAddress, otherAddress) {
    try {
      console.log('🔄 Loading messages between:', userAddress, 'and', otherAddress);

      if (!userAddress || !otherAddress) {
        throw new Error('Both user addresses are required');
      }

      // Get all messages where user and other are either sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_address.eq.${userAddress},receiver_address.eq.${otherAddress}),and(sender_address.eq.${otherAddress},receiver_address.eq.${userAddress})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded messages:', data?.length || 0, 'messages');
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      console.error('❌ Full error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  }

  static async deleteMessage(messageId, userAddress) {
    try {
      console.log('🔄 Deleting message:', messageId, 'by user:', userAddress);

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_address', userAddress);

      if (error) throw error;

      console.log('✅ Message deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions for messages
  static subscribeToMessages(userAddress, otherAddress, callback) {
    console.log('🔄 Subscribing to messages between:', userAddress, 'and', otherAddress);

    // Subscribe to messages where either user is sender or receiver
    return supabase
      .channel(`messages-${userAddress}-${otherAddress}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        // Filter messages between these two users
        const msg = payload.new || payload.old;
        if (msg && (
          (msg.sender_address === userAddress && msg.receiver_address === otherAddress) ||
          (msg.sender_address === otherAddress && msg.receiver_address === userAddress)
        )) {
          callback(payload);
        }
      })
      .subscribe();
  }

  static subscribeToUserMessages(userAddress, callback) {
    console.log('🔄 Subscribing to all messages for user:', userAddress);

    // Subscribe to all messages where user is sender or receiver
    return supabase
      .channel(`user-messages-${userAddress}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        // Filter messages where user is involved
        const msg = payload.new || payload.old;
        if (msg && (msg.sender_address === userAddress || msg.receiver_address === userAddress)) {
          callback(payload);
        }
      })
      .subscribe();
  }

  // Count unread messages for a user
  static async countUnreadMessages(userAddress) {
    try {
      console.log('🔄 Counting unread messages for user:', userAddress);

      // Count messages where user is receiver and is_read is false
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_address', userAddress.toLowerCase())
        .eq('is_read', false);

      if (error) throw error;

      console.log('✅ Unread messages count:', count);
      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('❌ Error counting unread messages:', error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  // Count unread messages from a specific sender
  static async countUnreadMessagesFromSender(receiverAddress, senderAddress) {
    try {
      console.log('🔄 Counting unread messages from:', senderAddress, 'to:', receiverAddress);

      // Count messages where user is receiver, sender is specific user, and is_read is false
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_address', receiverAddress.toLowerCase())
        .eq('sender_address', senderAddress.toLowerCase())
        .eq('is_read', false);

      if (error) throw error;

      console.log('✅ Unread messages from sender count:', count);
      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('❌ Error counting unread messages from sender:', error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  // Mark all messages from a specific sender as read
  static async markMessagesAsRead(receiverAddress, senderAddress) {
    try {
      console.log('🔄 Marking messages as read from:', senderAddress, 'to:', receiverAddress);

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_address', receiverAddress.toLowerCase())
        .eq('sender_address', senderAddress.toLowerCase())
        .eq('is_read', false);

      if (error) throw error;

      console.log('✅ Messages marked as read');
      return { success: true };
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark a single message as read by message ID
  static async markMessageAsRead(messageId) {
    try {
      console.log('🔄 Marking message as read:', messageId);

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('is_read', false);

      if (error) throw error;

      console.log('✅ Message marked as read');
      return { success: true };
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Get list of conversations with unread messages
  static async getUnreadConversations(userAddress) {
    try {
      console.log('🔄 Getting unread conversations for user:', userAddress);

      // Get all unread messages where user is receiver
      const { data: unreadMessages, error } = await supabase
        .from('messages')
        .select('sender_address, created_at')
        .eq('receiver_address', userAddress.toLowerCase())
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by sender and count
      const conversationsMap = new Map();

      unreadMessages?.forEach(msg => {
        const sender = msg.sender_address;
        if (conversationsMap.has(sender)) {
          conversationsMap.get(sender).unreadCount += 1;
          // Keep the most recent timestamp
          const existingTimestamp = new Date(conversationsMap.get(sender).lastMessageAt).getTime();
          const currentTimestamp = new Date(msg.created_at).getTime();
          if (currentTimestamp > existingTimestamp) {
            conversationsMap.get(sender).lastMessageAt = msg.created_at;
          }
        } else {
          conversationsMap.set(sender, {
            senderAddress: sender,
            unreadCount: 1,
            lastMessageAt: msg.created_at
          });
        }
      });

      // Convert to array
      const conversations = Array.from(conversationsMap.values());

      console.log('✅ Found', conversations.length, 'conversations with unread messages');
      return { success: true, data: conversations };
    } catch (error) {
      console.error('❌ Error getting unread conversations:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Alias for countUnreadMessages with clearer name
  static async getUnreadMessagesCount(userAddress) {
    return this.countUnreadMessages(userAddress);
  }

  // Message Media Purchases
  // NOTE: Before using these methods, ensure the 'chat-media' bucket exists in Supabase Storage
  // To create the bucket:
  // 1. Go to Supabase Dashboard > Storage
  // 2. Click "New bucket"
  // 3. Name: "chat-media"
  // 4. Public bucket: Yes (for media URLs to be accessible)
  // 5. File size limit: 50MB
  // 6. Allowed MIME types: image/*, video/*

  /**
   * Purchase a paid media message
   * @param {string} buyerAddress - Address of the buyer (lowercase)
   * @param {number} messageId - ID of the message containing the media
   * @param {number} amount - Amount paid in BNB
   * @param {string} txHash - Blockchain transaction hash
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  static async purchaseMessageMedia(buyerAddress, messageId, amount, txHash) {
    try {
      console.log('💰 Recording message media purchase:', {
        buyerAddress,
        messageId,
        amount,
        txHash
      });

      const { data, error } = await supabase
        .from('message_purchases')
        .insert([{
          buyer_address: buyerAddress.toLowerCase(),
          message_id: messageId,
          amount: amount,
          transaction_hash: txHash
        }])
        .select()
        .single();

      if (error) {
        // Check if error is due to duplicate purchase
        if (error.code === '23505') {
          console.log('⚠️ User already purchased this content');
          return {
            success: true,
            alreadyPurchased: true,
            message: 'Content already purchased'
          };
        }
        throw error;
      }

      console.log('✅ Purchase recorded successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error recording purchase:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has purchased a specific media message
   * @param {string} buyerAddress - Address of the buyer (lowercase)
   * @param {number} messageId - ID of the message
   * @returns {Promise<{success: boolean, hasPurchased: boolean, error?: string}>}
   */
  static async hasUserPurchasedMedia(buyerAddress, messageId) {
    try {
      console.log('🔍 Checking if user purchased media:', {
        buyerAddress,
        messageId
      });

      const { data, error } = await supabase
        .from('message_purchases')
        .select('id')
        .eq('buyer_address', buyerAddress.toLowerCase())
        .eq('message_id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const hasPurchased = !!data;
      console.log(`${hasPurchased ? '✅' : '❌'} User ${hasPurchased ? 'has' : 'has not'} purchased this media`);

      return { success: true, hasPurchased };
    } catch (error) {
      console.error('❌ Error checking purchase status:', error);
      return { success: false, hasPurchased: false, error: error.message };
    }
  }

  /**
   * Get all media purchases made by a user
   * @param {string} userAddress - Address of the user (lowercase)
   * @returns {Promise<{success: boolean, data?: array, error?: string}>}
   */
  static async getUserMessagePurchases(userAddress) {
    try {
      console.log('📊 Fetching all media purchases for user:', userAddress);

      const { data, error } = await supabase
        .from('message_purchases')
        .select(`
          *,
          messages (
            id,
            media_url,
            media_type,
            price,
            sender_address,
            created_at
          )
        `)
        .eq('buyer_address', userAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Found', data?.length || 0, 'purchases');
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching user purchases:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload media file to Supabase Storage 'chat-media' bucket
   * @param {File} file - File object to upload
   * @param {number} messageId - ID of the message (optional, for unique naming)
   * @returns {Promise<{success: boolean, url?: string, path?: string, error?: string}>}
   */
  static async uploadMessageMedia(file, messageId = null) {
    try {
      console.log('📤 Uploading message media to Storage:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        messageId
      });

      // Validate file
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 50MB');
      }

      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm'
      ];

      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Use JPG, PNG, GIF, WEBP for images or MP4, MOV, WEBM for videos');
      }

      // Generate unique file name
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop();
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.]/g, '_')
        .substring(0, 50); // Limit length

      const fileName = messageId
        ? `msg_${messageId}_${timestamp}_${randomStr}.${extension}`
        : `${timestamp}_${randomStr}_${sanitizedName}`;

      console.log('📝 Generated file name:', fileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }

      console.log('✅ File uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      console.log('✅ Public URL generated:', urlData.publicUrl);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (error) {
      console.error('❌ Error uploading message media:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete media file from Supabase Storage
   * @param {string} filePath - Path of the file in storage
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deleteMessageMedia(filePath) {
    try {
      console.log('🗑️ Deleting message media from Storage:', filePath);

      const { error } = await supabase.storage
        .from('chat-media')
        .remove([filePath]);

      if (error) throw error;

      console.log('✅ Media deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting message media:', error);
      return { success: false, error: error.message };
    }
  }
}