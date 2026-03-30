<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File as FileFacade;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FileUploadController extends Controller
{
    /** Allowed storage subdirs for download (no path traversal) */
    private const ALLOWED_DOWNLOAD_PREFIXES = ['requests/', 'verifications/', 'donations/', 'delivery_proofs/', 'projects/', 'uploads/'];

    /**
     * Download a file by path (authenticated users - admin or request owner).
     * Path must be within allowed storage directories.
     */
    public function download(Request $request)
    {
        $path = $request->query('path');
        if (empty($path) || ! is_string($path)) {
            return response()->json(['message' => 'Path is required'], 400);
        }
        $path = ltrim(str_replace('\\', '/', $path), '/');
        if (str_contains($path, '..')) {
            return response()->json(['message' => 'Invalid path'], 400);
        }
        $allowed = false;
        foreach (self::ALLOWED_DOWNLOAD_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $allowed = true;
                break;
            }
        }
        if (! $allowed) {
            return response()->json(['message' => 'Access denied'], 403);
        }
        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        $filename = basename($path);
        $publicRoot = realpath(storage_path('app/public'));
        $fullPath = realpath($disk->path($path));
        if ($publicRoot === false || $fullPath === false) {
            Log::warning('File download: path resolution failed', ['path' => $path]);

            return response()->json(['message' => 'Invalid path'], 400);
        }
        $rootPrefix = $publicRoot.DIRECTORY_SEPARATOR;
        if (! str_starts_with($fullPath, $rootPrefix) && $fullPath !== $publicRoot) {
            Log::warning('File download: resolved path outside public storage', ['path' => $path]);

            return response()->json(['message' => 'Access denied'], 403);
        }

        return response()->download($fullPath, $filename);
    }

    /**
     * Upload a file for requests or other entities
     */
    public function upload(Request $request): JsonResponse
    {
        try {
            $type = $request->input('type');

            $sizeLimits = [
                'verification_document' => 5120,
                'request_document' => 10240,
                'donation_document' => 10240,
                'delivery_proof' => 5120,
                'project' => 5120,
                'other' => 10240,
            ];

            $maxSize = $sizeLimits[$type] ?? 10240;

            $mimeTypes = [
                'verification_document' => 'jpg,jpeg,png,pdf',
                'request_document' => 'jpg,jpeg,png,pdf,doc,docx',
                'donation_document' => 'jpg,jpeg,png,pdf',
                'delivery_proof' => 'jpg,jpeg,png',
                'project' => 'jpg,jpeg,png,pdf',
                'other' => 'jpg,jpeg,png,pdf,doc,docx',
            ];

            $allowedMimes = $mimeTypes[$type] ?? 'jpg,jpeg,png,pdf,doc,docx';

            $validated = $request->validate([
                'file' => "required|file|max:{$maxSize}|mimes:{$allowedMimes}",
                'type' => 'required|in:request_document,verification_document,donation_document,delivery_proof,project,other',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: '.implode(', ', $e->errors()['file'] ?? []),
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $file = $request->file('file');

            if (! $file || ! $file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid file or file upload failed',
                ], 422);
            }

            $type = $validated['type'];

            $originalName = $file->getClientOriginalName();
            $originalName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);

            $extension = $file->getClientOriginalExtension();
            if (empty($extension)) {
                $mimeType = $file->getMimeType();
                $extension = match ($mimeType) {
                    'application/pdf' => 'pdf',
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'application/msword' => 'doc',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
                    default => 'bin',
                };
            }

            $filename = Str::uuid().'_'.time().'.'.strtolower($extension);

            $path = match ($type) {
                'request_document' => 'requests',
                'verification_document' => 'verifications',
                'donation_document' => 'donations',
                'delivery_proof' => 'delivery_proofs',
                'project' => 'projects',
                default => 'uploads',
            };

            $fullPath = storage_path('app/public/'.$path);
            if (! is_dir($fullPath)) {
                FileFacade::makeDirectory($fullPath, 0755, true);
            }

            $storedPath = $file->storeAs($path, $filename, 'public');

            if (! $storedPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to store file on server',
                ], 500);
            }

            $url = '/storage/'.$storedPath;

            return response()->json([
                'success' => true,
                'path' => $storedPath,
                'url' => $url,
                'filename' => $originalName,
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);
        } catch (\Throwable $e) {
            Log::error('File upload error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $request->file('file')?->getClientOriginalName(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload failed. Please try again or use a smaller file.',
            ], 500);
        }
    }

    /**
     * Upload multiple files
     */
    public function uploadMultiple(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'files' => 'required|array|min:1|max:5',
                'files.*' => 'required|file|max:10240',
                'type' => 'required|in:request_document,verification_document,donation_document,delivery_proof,other',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        $uploadedFiles = [];
        $errors = [];

        foreach ($request->file('files') as $index => $file) {
            try {
                $extension = $file->getClientOriginalExtension();
                $filename = Str::uuid().'_'.time().'_'.$index.'.'.$extension;

                $path = match ($validated['type']) {
                    'request_document' => 'requests',
                    'verification_document' => 'verifications',
                    'donation_document' => 'donations',
                    'delivery_proof' => 'delivery_proofs',
                    'project' => 'projects',
                    default => 'uploads',
                };

                $storedPath = $file->storeAs($path, $filename, 'public');
                $url = '/storage/'.$storedPath;

                $uploadedFiles[] = [
                    'path' => $storedPath,
                    'url' => $url,
                    'filename' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ];
            } catch (\Throwable $e) {
                Log::error('File upload multiple: single file failed', [
                    'message' => $e->getMessage(),
                    'original' => $file->getClientOriginalName(),
                ]);
                $errors[] = [
                    'file' => $file->getClientOriginalName(),
                    'error' => 'Upload failed',
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
