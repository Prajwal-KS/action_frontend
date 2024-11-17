import { useState } from 'react';
import axios from 'axios';
import { Play, Download, AlertCircle, FileDown } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useProcess } from '../context/ProcessContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = 'https://dove-touched-hare.ngrok-free.app';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Accept': '*/*',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
});

api.interceptors.request.use(
  (config) => {
    // Ensure headers object exists
    //@ts-ignore
    config.headers = {
      ...config.headers,
      'Accept': '*/*',
      'Access-Control-Allow-Origin': '*',
      'ngrok-skip-browser-warning': 'true'
    };

    // Special handling for FormData requests
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const ProcessPage = () => {
  const {
    file,
    setFile,
    detectionType,
    setDetectionType,
    uploadProgress,
    setUploadProgress,
    processedVideo,
    setProcessedVideo,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    analysisReport,
    setAnalysisReport,
  } = useProcess();
  
  const [firstFrame, setFirstFrame] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setProcessedVideo(null);
    setError(null);
    setAnalysisReport(null);
    setFirstFrame(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('detection_type', detectionType);

    try {
      // Health check with explicit headers
      const healthCheck = await axios({
        method: 'get',
        url: `${API_URL}/health`,
        headers: {
          'Accept': '*/*',
          'Access-Control-Allow-Origin': '*',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!healthCheck.data.models_status[detectionType]) {
        throw new Error(`${detectionType} model is not available`);
      }

      // Upload request with explicit headers
      const response = await axios({
        method: 'post',
        url: `${API_URL}/upload_video/`,
        data: formData,
        headers: {
          'Accept': '*/*',
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true'
        },
        params: {
          detection_type: detectionType,
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      if (response.data.filename) {
        const processedVideoUrl = `${API_URL}/outputs/${response.data.filename}`;
        setProcessedVideo(processedVideoUrl);
        setAnalysisReport(response.data.report);
        setFirstFrame(response.data.first_frame);
      } else {
        throw new Error('No filename received from server');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.detail || 
        err.message ||
        'An error occurred while processing the video.'
      );
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const generatePDFReport = () => {
    if (!analysisReport) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Logo image in Base64 format or a URL
    const logoURL = 'https://i.ibb.co/GFFDSxq/logo.png'; // Replace with your logo path
    const logoX = 10; // X-coordinate for logo placement
    const logoY = 0; // Y-coordinate for logo placement
    const logoWidth = 42; // Adjust logo width
    const logoHeight = 15; // Adjust logo height

    // Load and add the logo image
    doc.addImage(logoURL, 'PNG', logoX, logoY, logoWidth, logoHeight);

    // Title
    doc.setFontSize(20);
    doc.text('Video Analysis Report', pageWidth / 2, 20, { align: 'center' });
    
    // Timestamp
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 35);
    
    // Basic Information
    doc.setFontSize(16);
    doc.text('Basic Information', 20, 50);
    
    const basicInfo = [
      ['Detection Type', analysisReport.detection_type],
      ['Total Frames', analysisReport.total_frames.toString()],
      ['Video Duration', analysisReport.video_duration],
      ['Resolution', analysisReport.resolution],
      ['FPS', analysisReport.fps.toString()],
      ['Processing Time', analysisReport.processing_time]
    ];
    // @ts-ignore
    doc.autoTable({
      startY: 55,
      head: [['Parameter', 'Value']],
      body: basicInfo,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Detection Metrics
    doc.setFontSize(16);
    // @ts-ignore
    doc.text('Detection Metrics', 20, doc.lastAutoTable.finalY + 20);
    
    const detectionMetrics = [
      ['Total Detections', analysisReport.total_detections.toString()],
      ['Average Detections/Frame', analysisReport.average_detections_per_frame.toFixed(2)],
      ['Detection Confidence', `${analysisReport.detection_confidence.toFixed(2)}%`],
      ['Processing Rate', `${(analysisReport.total_frames / parseFloat(analysisReport.processing_time)).toFixed(2)} frames/sec`]
    ];
    // @ts-ignore
    doc.autoTable({
      // @ts-ignore
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Metric', 'Value']],
      body: detectionMetrics,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Performance Metrics
    doc.setFontSize(16);
    // @ts-ignore
    doc.text('Performance Metrics', 20, doc.lastAutoTable.finalY + 20);
    
    const performanceMetrics = [
      ['CPU Usage', `${analysisReport.performance_metrics.cpu_usage.toFixed(1)}%`],
      ['Memory Usage', `${analysisReport.performance_metrics.memory_usage.toFixed(1)} MB`],
      ['Processing Speed', `${analysisReport.performance_metrics.processing_speed.toFixed(1)} fps`],
      ['Real-time Factor', `${(analysisReport.performance_metrics.processing_speed / analysisReport.fps).toFixed(2)} x`]
    ];
    // @ts-ignore
    doc.autoTable({
      // @ts-ignore
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Metric', 'Value']],
      body: performanceMetrics,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Detected Classes
    doc.setFontSize(16);
    // @ts-ignore
    doc.text('Detected Classes', 20, doc.lastAutoTable.finalY + 20);
    
    // Define the mapping from class names to labels
    const classLabels = {
      "0.0": "Sitting",
      "1.0": "Standing",
      // Add more mappings as needed
    };

    const detectedClasses = Object.entries(analysisReport.detected_classes).map(
      ([className, count]) => [
        //@ts-ignore
        classLabels[className] || className, // Use label if available, else original className
        count.toString()
      ]
    );
    // @ts-ignore
    doc.autoTable({
      // @ts-ignore
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Class', 'Count']],
      body: detectedClasses,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`analysis-report-${new Date().toISOString()}.pdf`);
  };

  const handleDownload = async () => {
    if (!processedVideo) return;
    
    try {
      const response = await axios({
        method: 'get',
        url: processedVideo.replace('/outputs/', '/download/'),
        responseType: 'blob',
        headers: {
          'Accept': '*/*',
          'Access-Control-Allow-Origin': '*',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `processed_${detectionType}_${file?.name || 'video.mp4'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download the video. Please try again.');
    }
  };

  const downloadReport = () => {
    if (!analysisReport) return;
    generatePDFReport();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="card space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 
                       bg-clip-text text-transparent mb-2">
            Video Processing
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload your video and select the detection type to begin processing
          </p>
        </div>

        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload Video
            </label>
            <FileUpload file={file} onFileSelect={handleFileSelect} />
          </div>

          {/* Detection Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Detection Type
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setDetectionType('action')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${
                  detectionType === 'action'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Action Detection
              </button>
              <button
                onClick={() => setDetectionType('proximity')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${
                  detectionType === 'proximity'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Proximity Relation
              </button>
            </div>
          </div>

          {/* Process Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="btn-primary w-full py-3"
          >
            <Play className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Process Video'}</span>
          </button>

          {/* Progress Bar */}
          {isProcessing && uploadProgress > 0 && (
            <div className="relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="animate-pulse-slow shadow-lg bg-primary-600"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                {uploadProgress}% uploaded
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Processed Video Section */}
      {processedVideo && (
    <div className="card space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Processed Video
      </h2>
      
      <div className="rounded-lg overflow-hidden shadow-xl">
        {firstFrame && (
          <div className="relative">
            <img 
              src={`data:image/jpeg;base64,${firstFrame}`}
              alt="First frame of processed video"
              className="w-full rounded-lg"
            />
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              Preview Image
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleDownload}
          className="btn-primary bg-green-600 hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          <span>Download Processed Video</span>
        </button>
      </div>

          {/* Analysis Report */}
          {analysisReport && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Analysis Report</h3>
            <button
              onClick={downloadReport}
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center sm:justify-start"
            >
              <FileDown className="w-4 h-4 mr-2" />
              <span>Download PDF Report</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Basic Information</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Detection Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.detection_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Frames:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.total_frames}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Video Duration:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.video_duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.resolution}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">FPS:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.fps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.processing_time}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Detection Metrics</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Detections:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.total_detections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg. Detections/Frame:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.average_detections_per_frame}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Detection Confidence:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.detection_confidence.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Processing Rate:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {(analysisReport.total_frames / parseFloat(analysisReport.processing_time)).toFixed(2)} frames/sec
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Performance Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">CPU Usage:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.performance_metrics.cpu_usage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Memory Usage:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.performance_metrics.memory_usage.toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Processing Speed:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{analysisReport.performance_metrics.processing_speed.toFixed(1)} fps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Real-time Factor:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {(analysisReport.performance_metrics.processing_speed / analysisReport.fps).toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Detected Classes</h4>
              <div className="space-y-2">
                {Object.entries(analysisReport.detected_classes).map(([className, count]) => 
                {
                  // Define the mapping from class names to labels
                  const classLabels = {
                    "0.0": "Sitting",
                    "1.0": "Standing",
                    // Add more mappings as needed
                  };
                  // Use the mapped label if available, otherwise default to the className
                  //@ts-ignore
                  const displayName = classLabels[className] || className;

                  return (
                    <div key={className} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{displayName}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

export default ProcessPage;