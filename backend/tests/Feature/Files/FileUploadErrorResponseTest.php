<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

it('returns validation errors without stack traces for invalid upload payload', function () {
    $user = User::create([
        'name' => 'Uploader',
        'email' => 'up-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => 'donor_individual',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ]);

    $this->actingAs($user);

    $file = UploadedFile::fake()->create('doc.pdf', 200);

    $response = $this->post('/api/files/upload', [
        'type' => 'not_a_valid_upload_type',
        'file' => $file,
    ]);

    $response->assertStatus(422);
    $body = $response->getContent();
    expect($body)->not->toContain('vendor/');
    expect($body)->not->toContain('stack');
    expect($body)->not->toContain('.php:');
});
