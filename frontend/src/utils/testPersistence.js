// Test file to verify data persistence functionality
import {
  likesStorage,
  commentsStorage,
  notificationsStorage,
  deletedPostsStorage,
  storiesStorage,
  debugStorage
} from './storageUtils';

// Test functions for data persistence
export const testDataPersistence = () => {
  console.group('🧪 Testing Data Persistence');

  // Test likes persistence
  console.log('Testing Likes Storage...');
  const testLikeData = likesStorage.toggleLike('test_post_1', '0x123456789');
  console.log('Like data after toggle:', testLikeData);

  const retrievedLikes = likesStorage.getContentLikes('test_post_1');
  console.log('Retrieved likes:', retrievedLikes);

  // Test comments persistence
  console.log('Testing Comments Storage...');
  const testComment = commentsStorage.addComment('test_post_1', {
    text: 'This is a test comment!',
    author: 'Test User',
    authorAddress: '0x123456789'
  });
  console.log('Added comment:', testComment);

  const retrievedComments = commentsStorage.getContentComments('test_post_1');
  console.log('Retrieved comments:', retrievedComments);

  // Test notifications persistence
  console.log('Testing Notifications Storage...');
  const testNotification = notificationsStorage.add({
    type: 'like',
    user: { username: 'test_user', avatar: 'test_avatar' },
    message: 'liked your test post',
    postId: 'test_post_1'
  });
  console.log('Added notification:', testNotification);

  const retrievedNotifications = notificationsStorage.get();
  console.log('Retrieved notifications:', retrievedNotifications);

  // Test deleted posts persistence
  console.log('Testing Deleted Posts Storage...');
  deletedPostsStorage.add('test_post_2');
  const isDeleted = deletedPostsStorage.isDeleted('test_post_2');
  console.log('Post test_post_2 is deleted:', isDeleted);

  // Test stories persistence
  console.log('Testing Stories Storage...');
  const testStoryData = {
    id: Date.now(),
    creator: '0x123456789',
    creatorData: {
      username: 'test_user',
      avatarHash: null,
      isCreator: true
    },
    contentHash: 'test_story_hash',
    timestamp: Math.floor(Date.now() / 1000),
    expiryTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
    createdAt: new Date().toISOString()
  };

  storiesStorage.save(testStoryData);
  console.log('Added test story:', testStoryData.id);

  const retrievedStories = storiesStorage.getAll();
  console.log('Retrieved stories:', retrievedStories);

  // Show storage debug info
  console.log('Storage Debug Info:');
  debugStorage.logAll();
  const storageSize = debugStorage.getStorageSize();
  console.log('Storage size:', storageSize);

  console.groupEnd();

  return {
    likes: retrievedLikes,
    comments: retrievedComments,
    notifications: retrievedNotifications,
    deletedPosts: deletedPostsStorage.get(),
    stories: retrievedStories,
    storageSize
  };
};

// Test persistence after page refresh simulation
export const testPersistenceAfterRefresh = () => {
  console.group('🔄 Testing Persistence After Refresh Simulation');

  // Clear all state (simulate page refresh)
  console.log('Simulating page refresh...');

  // Re-load data from localStorage
  const likesAfterRefresh = likesStorage.get();
  const commentsAfterRefresh = commentsStorage.get();
  const notificationsAfterRefresh = notificationsStorage.get();
  const deletedPostsAfterRefresh = deletedPostsStorage.get();
  const storiesAfterRefresh = storiesStorage.getAll();

  console.log('Likes after refresh:', likesAfterRefresh);
  console.log('Comments after refresh:', commentsAfterRefresh);
  console.log('Notifications after refresh:', notificationsAfterRefresh);
  console.log('Deleted posts after refresh:', deletedPostsAfterRefresh);
  console.log('Stories after refresh:', storiesAfterRefresh);

  console.groupEnd();

  return {
    likesAfterRefresh,
    commentsAfterRefresh,
    notificationsAfterRefresh,
    deletedPostsAfterRefresh,
    storiesAfterRefresh
  };
};

// Clean up test data
export const cleanupTestData = () => {
  console.log('🧹 Cleaning up test data...');

  // Remove test data
  const allLikes = likesStorage.get();
  delete allLikes['test_post_1'];
  likesStorage.set(allLikes);

  const allComments = commentsStorage.get();
  delete allComments['test_post_1'];
  commentsStorage.set(allComments);

  deletedPostsStorage.restore('test_post_2');

  // Clean up test stories
  const testStories = storiesStorage.getAll();
  testStories.forEach(story => {
    if (story.creator === '0x123456789') {
      storiesStorage.remove(story.id);
    }
  });

  console.log('✅ Test data cleaned up');
};