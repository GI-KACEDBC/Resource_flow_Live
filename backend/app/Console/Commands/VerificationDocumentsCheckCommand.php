<?php

namespace App\Console\Commands;

use App\Models\VerificationDocument;
use Illuminate\Console\Command;

class VerificationDocumentsCheckCommand extends Command
{
    protected $signature = 'verification:check-documents';
    protected $description = 'Verify that verification documents are stored in the database';

    public function handle(): int
    {
        $count = VerificationDocument::count();

        $this->info("Verification documents in database: {$count}");

        if ($count === 0) {
            $this->warn('No verification documents found. Uploads may not be reaching the database.');
            $this->line('Check: storage/app/public/verification-documents/ for stored files.');
            return Command::SUCCESS;
        }

        $sample = VerificationDocument::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'user_id', 'document_type', 'file_name', 'verification_status', 'created_at']);

        $this->table(
            ['ID', 'User ID', 'Type', 'File', 'Status', 'Created'],
            $sample->map(fn ($d) => [
                $d->id,
                $d->user_id,
                $d->document_type,
                $d->file_name ?: '—',
                $d->verification_status,
                $d->created_at?->format('Y-m-d H:i'),
            ])
        );

        $this->info('Uploads are being stored in the database.');
        return Command::SUCCESS;
    }
}
