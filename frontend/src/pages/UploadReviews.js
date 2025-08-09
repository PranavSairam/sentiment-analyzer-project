import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import axios from 'axios';

const UploadReviews = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'text'

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please select a valid CSV or Excel file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      let response;
      
      if (uploadMethod === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        
        response = await axios.post(`${API_URL}/api/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (uploadMethod === 'text' && text.trim()) {
        response = await axios.post(`${API_URL}/api/analyze-text`, {
          text: text.trim(),
        });
      } else {
        setError(uploadMethod === 'file' ? 'Please select a file' : 'Please enter some text');
        setIsLoading(false);
        return;
      }

      setResults(response.data);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'An error occurred during upload');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setFile(null);
    setText('');
    setError(null);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Reviews
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload CSV/Excel files or paste review text for sentiment analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Upload Method
          </h2>

          {/* Method Selection */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setUploadMethod('file')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                uploadMethod === 'file'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>File Upload</span>
            </button>
            <button
              onClick={() => setUploadMethod('text')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                uploadMethod === 'text'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Text Input</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {uploadMethod === 'file' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select CSV or Excel File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      CSV, Excel files up to 10MB
                    </p>
                  </div>
                </div>
                {file && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Text
                </label>
                <textarea
                  id="review-text"
                  rows={6}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your review text here..."
                  value={text}
                  onChange={handleTextChange}
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Analyze Sentiment'
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analysis Results
              </h2>
              <button
                onClick={clearResults}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {Array.isArray(results) ? (
                // Multiple results from file upload
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Processed {results.length} reviews
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Review {index + 1}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              result.sentiment === 'positive'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : result.sentiment === 'negative'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {result.sentiment}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {result.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Single result from text input
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sentiment Analysis
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        results.sentiment === 'positive'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : results.sentiment === 'negative'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {results.sentiment}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {results.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadReviews; 