<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File as FileFacade;
use Illuminate\Support\Str;

class FileUploadController extends Controller
{
    /**
     * Upload a file for requests or other entities
     */
    public function upload(Request $request): JsonResponse
    {
        try {
            // Validate type first to determine file size limit
            $type = $request->input('type');
            
            // Define size limits based on file type (in KB, Laravel validation uses KB)
            $sizeLimits = [
                'verification_document' => 5120,  // 5MB - Ghana Card, Business Reg
                'request_document' => 10240,       // 10MB - Supporting documents
                'donation_document' => 10240,     // 10MB - Donation receipts
                'other' => 10240,                 // 10MB - Default
            ];
            
            $maxSize = $sizeLimits[$type] ?? 10240; // Default to 10MB
            
            // Define allowed mime types based on file type
            $mimeTypes = [
                'verification_document' => 'jpg,jpeg,png,pdf', // Images and PDFs for verification
                'request_document' => 'jpg,jpeg,png,pdf,doc,docx', // All document types
                'donation_document' => 'jpg,jpeg,png,pdf', // Receipts and invoices
                'other' => 'jpg,jpeg,png,pdf,doc,docx',
            ];
            
            $allowedMimes = $mimeTypes[$type] ?? 'jpg,jpeg,png,pdf,doc,docx';
            
            // Validate file and type with type-specific limits
            $validated = $request->validate([
                'file' => "required|file|max:{$maxSize}|mimes:{$allowedMimes}",
                'type' => 'required|in:request_document,verification_document,donation_document,other',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . implode(', ', $e->errors()['file'] ?? []),
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $file = $request->file('file');
            
            if (!$file || !$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid file or file upload failed',
                ], 422);
            }
            
            $type = $validated['type'];
            
            // Sanitize original filename
            $originalName = $file->getClientOriginalName();
            $originalName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
            
            // Get extension from original file or mime type
            $extension = $file->getClientOriginalExtension();
            if (empty($extension)) {
                // Try to get extension from mime type
                $mimeType = $file->getMimeType();
                $extension = match($mimeType) {
                    'application/pdf' => 'pdf',
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'application/msword' => 'doc',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
                    default => 'bin',
                };
            }
            
            // Generate unique filename
            $filename = Str::uuid() . '_' . time() . '.' . strtolower($extension);
            
            // Determine storage path based on type
            $path = match($type) {
                'request_document' => 'requests',
                'verification_document' => 'verifications',
                'donation_document' => 'donations',
                default => 'uploads',
            };
            
            // Ensure directory exists
            $fullPath = storage_path('app/public/' . $path);
            if (!is_dir($fullPath)) {
                FileFacade::makeDirectory($fullPath, 0755, true);
            }
            
            // Store file in public disk
            $storedPath = $file->storeAs($path, $filename, 'public');
            
            if (!$storedPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to store file on server',
                ], 500);
            }
            
            // Get full URL (relative path for storage)
            $url = '/storage/' . $storedPath;
            
            return response()->json([
                'success' => true,
                'path' => $storedPath,
                'url' => $url,
                'filename' => $originalName,
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);
        } catch (\Exception $e) {
            Log::error('File upload error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $request->file('file')?->getClientOriginalName(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'File upload failed: ' . $e->getMessage(),
                'error_details' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Upload multiple files
     */
    public function uploadMultiple(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'files' => 'required|array|min:1|max:5',
            'files.*' => 'required|file|max:10240', // 10MB max per file
            'type' => 'required|in:request_document,verification_document,donation_document,other',
        ]);

        $uploadedFiles = [];
        $errors = [];

        foreach ($request->file('files') as $index => $file) {
            try {
                $extension = $file->getClientOriginalExtension();
                $filename = Str::uuid() . '_' . time() . '_' . $index . '.' . $extension;
                
                $path = match($validated['type']) {
                    'request_document' => 'requests',
                    'verification_document' => 'verifications',
                    'donation_document' => 'donations',
                    default => 'uploads',
                };
                
                $storedPath = $file->storeAs($path, $filename, 'public');
                $url = '/storage/' . $storedPath;
                
                $uploadedFiles[] = [
                    'path' => $storedPath,
                    'url' => $url,
                    'filename' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ];
            } catch (\Exception $e) {
                $errors[] = [
                    'file' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ];
            }
        }

        if (count($errors) > 0 && count($uploadedFiles) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'All file uploads failed',
                'errors' => $errors,
            ], 500);
        }

        return response()->json([
            'success' => true,
            'files' => $uploadedFiles,
            'errors' => $errors,
        ]);
    }
}
