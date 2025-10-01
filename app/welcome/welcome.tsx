'use client';

import { useState, useEffect } from 'react';
import { saveWebsite, getWebsites, uploadVideo, deleteWebsite, getStorageUsage } from '../api/websites';
import type { WebsiteData } from '../api/websites';

type Tab = 'data' | 'websites' | 'designs';

export function Welcome() {
  const [activeTab, setActiveTab] = useState<Tab>('websites');
  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    categories: '',
    twitter: '',
    instagram: '',
    builtWith: '',
    otherTechnologies: '',
  });

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Delete website state
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Storage usage state
  const [storageUsage, setStorageUsage] = useState<{ fileCount: number; totalSize: number; folders: { [key: string]: { count: number; size: number } } } | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  // Load websites on component mount
  useEffect(() => {
    loadWebsites();
  }, []);

  const loadWebsites = async () => {
    try {
      const fetchedWebsites = await getWebsites();
      setWebsites(fetchedWebsites);
    } catch (error) {
      console.error('Error loading websites:', error);
    }
  };

  const loadStorageUsage = async () => {
    setIsLoadingStorage(true);
    try {
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading storage usage:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  // Load storage usage when data tab is selected
  useEffect(() => {
    if (activeTab === 'data') {
      loadStorageUsage();
    }
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Video file selected:', file.name, 'Size:', file.size);

      // Validate file type
      if (!file.type.startsWith('video/')) {
        console.error('Invalid file type:', file.type);
        setSubmitMessage('Please select a valid video file');
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        console.error('File too large:', file.size);
        setSubmitMessage('Video file must be smaller than 100MB');
        return;
      }

      console.log('Video file validated successfully');
      setVideoFile(file);
      setSubmitMessage(null);
    }
  };

  const handleDeleteWebsite = async (websiteId: string) => {
    if (!confirm('Are you sure you want to delete this website?')) {
      return;
    }

    setIsDeleting(websiteId);
    try {
      await deleteWebsite(websiteId);
      // Remove from local state
      setWebsites(prev => prev.filter(website => website.id !== websiteId));
      setSubmitMessage('Website deleted successfully!');
    } catch (error) {
      console.error('Error deleting website:', error);
      setSubmitMessage('Error deleting website. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCheckboxChange = (tech: string, checked: boolean) => {
    // This function is no longer needed since we're using text input
    // But keeping it for compatibility
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      console.log('Starting website submission...');

      // Check if Firebase is configured
      if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
        setSubmitMessage('Firebase configuration is missing. Please check your .env file with your Firebase project settings.');
        return;
      }

      let videoUrl: string | undefined;

      // Upload video if one is selected
      if (videoFile) {
        setIsUploadingVideo(true);
        try {
          videoUrl = await uploadVideo(videoFile);
        } catch (error) {
          setSubmitMessage('Failed to upload video. Please try again.');
          return;
        } finally {
          setIsUploadingVideo(false);
        }
      }

      const websiteData = {
        name: formData.name,
        url: formData.url,
        categories: formData.categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0),
        socialLinks: {
          ...(formData.twitter && { twitter: `https://twitter.com/${formData.twitter}` }),
          ...(formData.instagram && { instagram: `https://instagram.com/${formData.instagram}` }),
        },
        builtWith: formData.builtWith,
        ...(formData.otherTechnologies && { otherTechnologies: formData.otherTechnologies }),
        ...(videoUrl && { videoUrl }),
      };

      await saveWebsite(websiteData);
      setSubmitMessage('Website saved successfully!');
      setFormData({
        name: '',
        url: '',
        categories: '',
        twitter: '',
        instagram: '',
        builtWith: '',
        otherTechnologies: '',
      });
      setVideoFile(null);

      // Reset file input
      const fileInput = document.getElementById('video-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload websites
      await loadWebsites();
    } catch (error) {
      console.error('Error saving website:', error);
      setSubmitMessage('Error saving website. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="w-full h-[45px] border-b border-gray-200 bg-white flex items-center justify-between px-5 flex-shrink-0 sticky top-0 z-10">
        <span className="text-xl font-semibold text-gray-800">Gridrr</span>
        <nav className="flex items-center space-x-6">
          <button 
            onClick={() => setActiveTab('data')} 
            className={`${activeTab === 'data' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium`}
          >
            Data Management
          </button>
          <button 
            onClick={() => setActiveTab('websites')} 
            className={`${activeTab === 'websites' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium`}
          >
            Websites
          </button>
          <button 
            onClick={() => setActiveTab('designs')} 
            className={`${activeTab === 'designs' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium`}
          >
            Designs
          </button>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto w-full">
        {activeTab === 'websites' && (
          <div className="min-h-full w-full bg-white flex flex-col items-center p-6 pb-20">
            <form onSubmit={handleSubmit} className="w-full max-w-md">
            {/* Upload Section */}
            <div className="max-w-md w-full text-center mb-8">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors hover:border-blue-400">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Upload your website</h3>
                <p className="text-sm text-gray-500 mb-4">Drag and drop your video here, or click to browse</p>

                {/* Video Upload Status */}
                {videoFile && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm text-green-800">
                        Video selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="file"
                    id="video-upload"
                    name="video-upload"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <label
                    htmlFor="video-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Select video
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">MP4, WebM, or MOV up to 100MB</p>
              </div>
            </div>
            
            {/* Website Name */}
            <div className="w-full max-w-md mb-4">
              <label htmlFor="website-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name of website
              </label>
              <input
                type="text"
                id="website-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter website name"
                required
              />
            </div>
            
            {/* Website Categories */}
            <div className="w-full max-w-md mb-4">
              <label htmlFor="website-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Categories <span className="text-gray-400 font-normal">(comma separated)</span>
              </label>
              <input
                type="text"
                id="website-tags"
                name="categories"
                value={formData.categories}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., portfolio, business, blog"
              />
            </div>

            {/* Website URL */}
            <div className="w-full max-w-md mb-6">
              <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <input
                  type="url"
                  name="url"
                  id="website-url"
                  value={formData.url}
                  onChange={handleInputChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border border-gray-300 rounded-md text-gray-900 py-2.5 h-11"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>

            {/* Social Links Section */}
            <div className="w-full max-w-md">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Social Links</h3>
              
              {/* Twitter URL */}
              <div className="mb-4">
                <label htmlFor="twitter-url" className="block text-sm font-medium text-gray-700 mb-1">Twitter Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="twitter"
                    id="twitter-url"
                    value={formData.twitter}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border border-gray-300 rounded-md text-gray-900 py-2.5 h-11"
                    placeholder="username"
                  />
                </div>
              </div>

              {/* Instagram URL */}
              <div className="mb-4">
                <label htmlFor="instagram-url" className="block text-sm font-medium text-gray-700 mb-1">Instagram Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.428.047 1.023.06 1.378.06 3.808s-.013 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.428.465-1.023.047-1.378.06-3.807.06s-2.784-.013-3.808-.06c-1.065-.049-1.792-.218-2.428-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427C2.013 14.784 2 14.428 2 12s.013-2.784.06-3.808c.049-1.064.218-1.791.465-2.428A4.902 4.902 0 013.678 3.63a4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.428-.465C9.216 2.013 9.57 2 12 2zm0 1.5c-2.41 0-2.746.01-3.75.05-.98.045-1.51.203-1.867.344-.466.182-.8.4-1.15.75-.35.35-.568.684-.75 1.15-.14.357-.3.886-.344 1.867C4.01 9.253 4 9.59 4 12s.01 2.746.05 3.75c.045.98.203 1.51.344 1.867.182.466.4.8.75 1.15.35.35.684.568 1.15.75.357.14.886.3 1.867.344 1.004.04 1.34.05 3.75.05s2.746-.01 3.75-.05c.98-.045 1.51-.203 1.867-.344.466-.182.8-.4 1.15-.75.35-.35.568-.684.75-1.15.14.357-.3.886.344-1.867.04-1.004.05-1.34.05-3.75s-.01-2.746-.05-3.75c-.045-.98-.203-1.51-.344-1.867a3.4 3.4 0 00-.75-1.15 3.4 3.4 0 00-1.15-.75c-.357-.14-.886-.3-1.867-.344-1.004-.04-1.34-.05-3.75-.05zM12 7a5 5 0 100 10 5 5 0 000-10zm0 1.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm9.002-3.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="instagram"
                    id="instagram-url"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border border-gray-300 rounded-md text-gray-900 py-2.5 h-11"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            {/* Built With Section */}
            <div className="w-full max-w-md mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Built With</h3>
              <div className="mt-4">
                <label htmlFor="built-with" className="block text-sm font-medium text-gray-700 mb-1">
                  Technologies Used
                </label>
                <input
                  type="text"
                  name="builtWith"
                  id="built-with"
                  value={formData.builtWith}
                  onChange={handleInputChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md text-gray-900"
                  placeholder="e.g., React, Node.js, MongoDB"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="w-full max-w-md mt-6">
              <button
                type="submit"
                disabled={isSubmitting || isUploadingVideo}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingVideo ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading video...
                  </>
                ) : isSubmitting ? (
                  'Saving...'
                ) : (
                  'Save Website'
                )}
              </button>

              {submitMessage && (
                <div className={`mt-3 text-sm text-center ${submitMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {submitMessage}
                </div>
              )}
            </div>
            </form>
            {/* Removed extra bottom spacing div as we're using pb-20 on parent */}
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <div className="min-h-full w-full bg-white p-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Management</h2>

              {/* Storage Usage Section - Moved to Top */}
              <div className="mb-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                  </svg>
                  Firebase Storage Usage
                </h3>

                {isLoadingStorage ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-sm text-gray-600">Calculating storage usage...</span>
                  </div>
                ) : storageUsage ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Usage */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Total Files</p>
                          <p className="text-2xl font-semibold text-gray-900">{storageUsage.fileCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Total Size */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z"></path>
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Total Size</p>
                          <p className="text-2xl font-semibold text-gray-900">{(storageUsage.totalSize / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Firebase Free Tier Info */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Free Tier Limit</p>
                          <p className="text-2xl font-semibold text-gray-900">5 GB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Unable to load storage information</p>
                  </div>
                )}

                {/* Folder Breakdown */}
                {storageUsage && Object.keys(storageUsage.folders).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Storage Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(storageUsage.folders).map(([folder, stats]) => (
                        <div key={folder} className="flex items-center justify-between py-2 px-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h2a2 2 0 012 2v0M8 5a2 2 0 012-2h2a2 2 0 012 2v0"></path>
                            </svg>
                            <span className="text-sm font-medium text-gray-900">{folder.replace('/', '')}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{stats.count} files</span>
                            <span>{(stats.size / (1024 * 1024)).toFixed(1)} MB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Refresh Button */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={loadStorageUsage}
                    disabled={isLoadingStorage}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoadingStorage ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Refresh Storage Info
                      </>
                    )}
                  </button>
                </div>
              </div>

              {websites.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No websites</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding some websites in the Websites tab.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {websites.map((website) => (
                      <li key={website.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900 truncate">{website.name}</p>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {website.categories.length > 0 ? website.categories[0] : 'Uncategorized'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <a href={website.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-gray-900">
                                {website.url}
                              </a>
                              {website.videoUrl && (
                                <span className="ml-4 inline-flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                  </svg>
                                  Video
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                              {website.builtWith && (
                                <span>Built with: {website.builtWith} • </span>
                              )}
                              <span>{website.uploadedAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => handleDeleteWebsite(website.id!)}
                              disabled={isDeleting === website.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              {isDeleting === website.id ? (
                                <>
                                  <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <svg className="-ml-0.5 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {submitMessage && (
                <div className={`mt-4 text-sm text-center ${submitMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {submitMessage}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
