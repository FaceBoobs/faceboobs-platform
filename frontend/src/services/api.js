import { supabase } from '../lib/supabase'

// Upload immagine
export const uploadImage = async (file) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file)
    
    if (error) {
      console.error('Upload error:', error)
      throw error
    }
    
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)
      
    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadImage:', error)
    throw error
  }
}

// Posts API
export const createPost = async (postData) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([postData])
      .select()
    
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error creating post:', error)
    throw error
  }
}

export const getPosts = async () => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting posts:', error)
    throw error
  }
}

export const getUserPosts = async (userAddress) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('creator_address', userAddress)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting user posts:', error)
    throw error
  }
}

// Likes API
export const toggleLike = async (postId, userAddress) => {
  try {
    // Controlla se esiste già
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_address', userAddress)
      .single()
    
    if (existing) {
      // Rimuovi like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_address', userAddress)
      
      if (error) throw error
      return false // Unlike
    } else {
      // Aggiungi like
      const { error } = await supabase
        .from('likes')
        .insert([{ post_id: postId, user_address: userAddress }])
      
      if (error) throw error
      return true // Like
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    throw error
  }
}

export const getPostLikes = async (postId) => {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error getting likes:', error)
    return 0
  }
}

export const hasUserLiked = async (postId, userAddress) => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_address', userAddress)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return !!data
  } catch (error) {
    console.error('Error checking user like:', error)
    return false
  }
}

// Comments API
export const addComment = async (postId, userAddress, username, content) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        post_id: postId,
        user_address: userAddress,
        username: username,
        content: content
      }])
      .select()
    
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

export const getPostComments = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting comments:', error)
    return []
  }
}

// Stories API
export const createStory = async (storyData) => {
  try {
    console.log('Creating story with data:', storyData)
    
    const { data, error } = await supabase
      .from('stories')
      .insert([storyData])
      .select()
    
    if (error) {
      console.error('Supabase error creating story:', error)
      throw error
    }
    
    console.log('Story created successfully:', data[0])
    return data[0]
  } catch (error) {
    console.error('Error creating story:', error)
    throw error
  }
}

export const getActiveStories = async () => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting stories:', error)
    return []
  }
}

export const getUserStories = async (userAddress) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('creator_address', userAddress)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting user stories:', error)
    return []
  }
}

export const getAllUserStories = async (userAddress) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('creator_address', userAddress)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting all user stories:', error)
    return []
  }
}

export const deleteExpiredStories = async () => {
  try {
    const { error } = await supabase
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) throw error
    console.log('Expired stories deleted')
  } catch (error) {
    console.error('Error deleting expired stories:', error)
  }
}

// Utility function per verificare se una story è ancora attiva
export const isStoryActive = (story) => {
  const now = new Date()
  const expiryTime = new Date(story.expires_at)
  return expiryTime > now
}

// Funzione per calcolare il tempo rimanente di una story
export const getStoryTimeRemaining = (story) => {
  const now = new Date()
  const expiryTime = new Date(story.expires_at)
  const diffMs = expiryTime - now
  
  if (diffMs <= 0) return 'Expired'
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m left`
  } else {
    return `${minutes}m left`
  }
}