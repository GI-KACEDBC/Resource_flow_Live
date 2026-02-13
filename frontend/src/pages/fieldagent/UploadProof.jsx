// ## Upload Proof Component
// ## Field Agent interface for uploading proof of impact with geo-tagging
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, MapPin, Upload, X, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { impactProofApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const UploadProof = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get('project');

  const [formData, setFormData] = useState({
    project_id: preselectedProjectId || '',
    proof_type: 'photo',
    description: '',
    location_name: '',
    latitude: '',
    longitude: '',
    metadata: {},
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errors, setErrors] = useState({});
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await impactProofApi.getActiveProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
      },
      (error) => {
        setGeoError('Unable to get location: ' + error.message);
      }
    );
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.project_id) {
      newErrors.project_id = 'Please select a project';
    }
    
    if (!formData.proof_type) {
      newErrors.proof_type = 'Please select proof type';
    }
    
    // File required for photo, video, document
    if (['photo', 'video', 'document'].includes(formData.proof_type) && !file) {
      newErrors.file = 'Please upload a file';
    }
    
    // Description required for notes
    if (formData.proof_type === 'note' && !formData.description.trim()) {
      newErrors.description = 'Please provide a description for the note';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const submitFormData = new FormData();
      submitFormData.append('project_id', formData.project_id);
      submitFormData.append('proof_type', formData.proof_type);
      submitFormData.append('description', formData.description || '');
      submitFormData.append('location_name', formData.location_name || '');
      
      if (formData.latitude) {
        submitFormData.append('latitude', formData.latitude);
      }
      if (formData.longitude) {
        submitFormData.append('longitude', formData.longitude);
      }
      
      if (file) {
        submitFormData.append('file', file);
      }

      // Add metadata
      const metadata = {};
      if (formData.metadata) {
        Object.entries(formData.metadata).forEach(([key, value]) => {
          metadata[key] = value;
        });
      }
      submitFormData.append('metadata', JSON.stringify(metadata));

      await impactProofApi.create(submitFormData);
      
      // Set flag to trigger refresh
      localStorage.setItem('impact_proof_created', Date.now().toString());
      
      // Success - navigate back
      navigate('/dashboard');
    } catch (error) {
      console.error('Error uploading proof:', error);
      let errorMessage = 'Failed to upload proof. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      }
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          icon={ArrowLeft}
          onClick={() => navigate('/dashboard')}
          size="sm"
        >
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Upload Proof of Impact</h2>
          <p className="text-slate-500 mt-1">Document the impact of active projects</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Project *
          </label>
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              <span>Loading projects...</span>
            </div>
          ) : (
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.project_id ? 'border-red-300' : 'border-slate-300'
              }`}
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} - {project.location || 'No location'}
                </option>
              ))}
            </select>
          )}
          {errors.project_id && (
            <p className="text-sm text-red-600 mt-1">{errors.project_id}</p>
          )}
        </div>

        {/* Proof Type */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Proof Type *
          </label>
          <select
            name="proof_type"
            value={formData.proof_type}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              errors.proof_type ? 'border-red-300' : 'border-slate-300'
            }`}
            required
          >
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="note">Note</option>
          </select>
          {errors.proof_type && (
            <p className="text-sm text-red-600 mt-1">{errors.proof_type}</p>
          )}
        </div>

        {/* File Upload */}
        {['photo', 'video', 'document'].includes(formData.proof_type) && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              File *
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 transition">
              <input
                type="file"
                onChange={handleFileChange}
                accept={
                  formData.proof_type === 'photo' ? 'image/*' :
                  formData.proof_type === 'video' ? 'video/*' :
                  'application/pdf,.doc,.docx'
                }
                className="hidden"
                id="file-upload"
                required
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div>
                    {preview && (
                      <img src={preview} alt="Preview" className="max-h-48 mx-auto mb-2 rounded" />
                    )}
                    <p className="text-sm text-slate-600">{file.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        setPreview(null);
                      }}
                      className="mt-2"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-sm text-slate-600">
                      Click to upload {formData.proof_type}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Max 10MB. Supported: {formData.proof_type === 'photo' ? 'JPG, PNG' : formData.proof_type === 'video' ? 'MP4, MOV' : 'PDF, DOC'}
                    </p>
                  </div>
                )}
              </label>
            </div>
            {errors.file && (
              <p className="text-sm text-red-600 mt-1">{errors.file}</p>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Description {formData.proof_type === 'note' && '*'}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              errors.description ? 'border-red-300' : 'border-slate-300'
            }`}
            placeholder="Describe the impact, beneficiaries, or observations..."
            required={formData.proof_type === 'note'}
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Location Name
            </label>
            <Input
              type="text"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              placeholder="e.g., Accra Central, Kumasi Market"
              icon={MapPin}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Get Current Location
            </label>
            <Button
              type="button"
              variant="outline"
              icon={MapPin}
              onClick={getCurrentLocation}
              className="w-full"
            >
              Get GPS Location
            </Button>
            {geoError && (
              <p className="text-sm text-red-600 mt-1">{geoError}</p>
            )}
            {(formData.latitude && formData.longitude) && (
              <p className="text-xs text-slate-500 mt-1">
                Lat: {parseFloat(formData.latitude).toFixed(6)}, Lng: {parseFloat(formData.longitude).toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {/* Coordinates (read-only if set) */}
        {(formData.latitude || formData.longitude) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Latitude
              </label>
              <Input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                step="any"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Longitude
              </label>
              <Input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                step="any"
                readOnly
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            icon={Upload}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Uploading...' : 'Upload Proof'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UploadProof;
