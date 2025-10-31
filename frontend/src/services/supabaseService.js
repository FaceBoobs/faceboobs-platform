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

  // Likes
  static async toggleLike(postId, userAddress, username = null) {
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
            from_username: username
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
          from_username: commentData.username
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
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
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
      const { data, error } = await supabase
        .from('purchases')
        .select('post_id')
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true, data: data.map(purchase => purchase.post_id) };
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
    return supabase
      .channel(`notifications-${userAddress}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_address=eq.${userAddress}`
      }, callback)
      .subscribe();
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
}