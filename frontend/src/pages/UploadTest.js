import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import ImageUpload from '../components/ImageUpload';
import MediaDisplay from '../components/MediaDisplay';

const UploadTest = () => {
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const { debugStoredImages, testImageUpload } = useWeb3();

  const handleImageSelect = (uploadData) => {
    console.log('📋 Image selected:', uploadData);
    setUploadedFileId(uploadData.fileId);
    setUploadedFile(uploadData.file);
  };

  const handleImageRemove = () => {
    console.log('🗑️ Image removed');
    setUploadedFileId(null);
    setUploadedFile(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Image Upload System Test</h1>
        <p className="text-gray-600 mb-6">Test the FileReader localStorage upload functionality</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Upload New Image</h2>
            <ImageUpload
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              placeholder="Select an image to test upload"
              maxSize={5 * 1024 * 1024} // 5MB for testing
            />
          </div>

          {/* Display Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Display Uploaded Image</h2>
            {uploadedFileId ? (
              <div className="space-y-4">
                <MediaDisplay
                  fileId={uploadedFileId}
                  isLocked={false}
                  onImageClick={(mediaUrl) => {
                    // Open in new window for full size view
                    const newWindow = window.open();
                    newWindow.document.write(`
                      <html>
                        <head><title>Image Preview</title></head>
                        <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
                          <img src="${mediaUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                        </body>
                      </html>
                    `);
                  }}
                />
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-green-800">✅ Upload Successful!</p>
                  <p className="text-green-700">File ID: {uploadedFileId}</p>
                  <p className="text-green-600">File: {uploadedFile?.name}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">Upload an image above to see it here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug Tools */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">Debug Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              debugStoredImages();
              alert('Check the browser console for stored images list');
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            📋 List Stored Images (Console)
          </button>

          <button
            onClick={async () => {
              const result = await testImageUpload();
              if (result.success) {
                alert(`✅ Test passed! Created file ID: ${result.fileId}`);
              } else {
                alert(`❌ Test failed: ${result.error}`);
              }
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            🧠 Test Image Upload Workflow
          </button>
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg border">
          <h3 className="font-medium text-blue-800 mb-2">How to Test:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Click the upload area above to select an image</li>
            <li>Watch the console logs for upload progress</li>
            <li>See the image appear in the display section</li>
            <li>Click the displayed image to view full size</li>
            <li>Use debug tools to inspect localStorage</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default UploadTest;