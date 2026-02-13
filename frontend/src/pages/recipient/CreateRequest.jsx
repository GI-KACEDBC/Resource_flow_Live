// ## Create Request View
// ## Form for recipients to submit resource requests with aid type and file upload
import React, { useState } from 'react';
import { ArrowLeft, Package, MapPin, AlertCircle, Save, Upload, File } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUpload } from '../../components/ui/FileUpload';
import { requestApi } from '../../services/api';

const CreateRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // ## Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    aid_type: 'Education',
    custom_aid_type: '',
    need_type: 'emergency_food',
    time_sensitivity: '24_to_72h',
    recipient_type: 'rural_clinic',
    availability_gap: 50,
    admin_override: 0,
  });

  // ## Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // ## Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    // ## Clear custom_aid_type if aid_type is not 'Other'
    if (name === 'aid_type' && value !== 'Other') {
      setFormData((prev) => ({
        ...prev,
        custom_aid_type: '',
      }));
    }
  };

  // ## Handle file upload with size validation
  const handleFileUpload = (file) => {
    if (!file) return;
    
    // Frontend file size validation - 10MB limit for request documents
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSizeBytes) {
      setErrors({
        files: `File "${file.name}" is too large! Maximum size is 10MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
      return;
    }
    
    // Clear any previous file errors
    if (errors.files) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.files;
        return newErrors;
      });
    }
    
    setUploadedFiles((prev) => [...prev, file]);
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ## Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.aid_type) newErrors.aid_type = 'Aid type is required';
    if (formData.aid_type === 'Other' && !formData.custom_aid_type.trim()) {
      newErrors.custom_aid_type = 'Please specify the aid type';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ## Handle file upload to server
  const uploadFiles = async () => {
    const filePaths = [];
    const uploadErrors = [];
    
    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'request_document');
      
      try {
        console.log(`Uploading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        const response = await requestApi.uploadFile(formData);
        
        console.log('Upload response received:', response);
        
        // Check response structure
        if (!response) {
          uploadErrors.push(`Failed to upload ${file.name}: No response from server`);
          continue;
        }
        
        if (response.success && response.path) {
          filePaths.push(response.path);
          console.log(`File uploaded successfully: ${response.path}`);
        } else {
          // Response exists but indicates failure
          const errorMsg = response?.message || response?.error || 'Upload failed - server returned error';
          uploadErrors.push(`Failed to upload ${file.name}: ${errorMsg}`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        console.error('Error type:', error?.constructor?.name);
        console.error('File details:', { 
          name: file.name, 
          size: file.size, 
          type: file.type,
          lastModified: file.lastModified 
        });
        
        // Check for rate limiting error (429 Too Many Requests)
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          uploadErrors.push(
            `Rate limit exceeded for ${file.name}. Please wait ${retryAfter} seconds before trying again.`
          );
          continue;
        }
        
        // Extract error message
        let errorMessage = 'Unknown error';
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.response?.data?.errors) {
          const errors = Object.values(error.response.data.errors).flat();
          errorMessage = errors.join(', ');
        } else if (error?.response?.status) {
          errorMessage = `Server error (${error.response.status})`;
        } else if (error?.code) {
          errorMessage = `Network error: ${error.code}`;
        }
        
        uploadErrors.push(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }
    
    // If any uploads failed, throw error with details
    if (uploadErrors.length > 0) {
      throw new Error(uploadErrors.join('; '));
    }
    
    return filePaths;
  };

  // ## Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({}); // Clear previous errors
    
    try {
      // ## Upload files first
      let supportingDocuments = [];
      if (uploadedFiles.length > 0) {
        try {
          supportingDocuments = await uploadFiles();
        } catch (uploadError) {
          // File upload error - show it clearly
          setErrors({ 
            submit: `File upload failed: ${uploadError.message}. Please try again or remove the files and submit without them.`,
            files: uploadError.message
          });
          setIsSubmitting(false);
          return;
        }
      }

      // ## Submit request via API
      const newRequest = await requestApi.create({
        ...formData,
        supporting_documents: supportingDocuments,
      });

      // ## Set flag to trigger dashboard refresh
      localStorage.setItem('request_created', Date.now().toString());

      // ## Success - navigate back to dashboard
      navigate('/dashboard');
          } catch (error) {
            console.error('Error creating request:', error);
            console.error('Error response:', error.response?.data);

            // ## Check for rate limiting (429 Too Many Requests)
            if (error.response?.status === 429) {
              const retryAfter = error.response.headers['retry-after'] || 60;
              setErrors({
                submit: `Too many requests. Please wait ${retryAfter} seconds before trying again.`
              });
              setIsSubmitting(false);
              return;
            }

            // ## Show detailed error message
            let errorMessage = 'Failed to create request. Please try again.';

            if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors) {
              // ## Validation errors
              const validationErrors = Object.values(error.response.data.errors).flat();
              errorMessage = validationErrors.join(', ');
            } else if (error.message) {
              errorMessage = error.message;
            }

            setErrors({
              submit: errorMessage
            });
          } finally {
            setIsSubmitting(false);
          }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* ## Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          icon={ArrowLeft}
          onClick={() => navigate('/dashboard')}
        >
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Create Aid Request</h2>
          <p className="text-slate-500 mt-1">Submit a new request for aid resources</p>
        </div>
      </div>

      {/* ## Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* ## Basic Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={20} />
            Basic Information
          </h3>
          <div className="space-y-4">
            <Input
              label="Request Title *"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              placeholder="e.g., Medical Supplies for Rural Clinic"
            />
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Aid Type *
              </label>
              <select
                name="aid_type"
                value={formData.aid_type}
                onChange={handleChange}
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.aid_type ? 'border-red-500' : 'border-slate-200'
                }`}
              >
                <option value="Education">Education</option>
                <option value="Health">Health</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Other">Other</option>
              </select>
              {errors.aid_type && (
                <p className="text-xs text-red-500 mt-1">{errors.aid_type}</p>
              )}
            </div>
            {formData.aid_type === 'Other' && (
              <Input
                label="Specify Aid Type *"
                name="custom_aid_type"
                value={formData.custom_aid_type}
                onChange={handleChange}
                error={errors.custom_aid_type}
                placeholder="e.g., Agricultural Support, Water Supply"
              />
            )}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.description ? 'border-red-500' : 'border-slate-200'
                }`}
                placeholder="Provide details about why this aid is needed, target beneficiaries, and any specific requirements..."
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* ## Supporting Documents */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Upload size={20} />
            Supporting Documents
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload any supporting documents (photos, letters, reports, etc.)
          </p>
          
          {/* File upload error */}
          {errors.files && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-600 shrink-0" size={18} />
              <p className="text-sm text-red-700">{errors.files}</p>
            </div>
          )}
          
          {/* ## File Upload Component */}
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <File className="text-slate-400" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-3 p-1 text-red-600 hover:bg-red-100 rounded transition"
                  title="Remove file"
                >
                  <AlertCircle size={18} />
                </button>
              </div>
            ))}
            
            {uploadedFiles.length < 5 && (
              <FileUpload
                label="Add Supporting Document"
                name="supporting_document"
                accept="image/*,.pdf,.doc,.docx"
                maxSizeMB={10}
                onChange={handleFileUpload}
                description="Upload images, PDFs, or documents (max 10MB each, up to 5 files)"
              />
            )}
          </div>
        </div>

        {/* ## Urgency Details - These are required by backend but can use defaults */}
        {/* Hidden fields are included in formData state above */}

        {/* ## Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-sm text-red-700">{errors.submit}</p>
          </div>
        )}

        {/* ## Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            icon={Save}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequest;
