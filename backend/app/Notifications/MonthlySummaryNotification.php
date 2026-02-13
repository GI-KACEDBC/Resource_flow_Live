<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MonthlySummaryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $flaggedCount
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Monthly Review: ' . $this->flaggedCount . ' Request(s) Flagged for Review')
            ->greeting('Monthly Request Review Summary')
            ->line($this->flaggedCount . ' request(s) have been flagged for review as they exceed the 30-day SLA without being matched.')
            ->action('Review Flagged Requests', url('/dashboard/flagged-requests'))
            ->line('Please log in to review and take action (close or boost urgency).');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'monthly_summary',
            'flagged_count' => $this->flaggedCount,
            'message' => $this->flaggedCount . ' request(s) flagged for monthly review.',
        ];
    }
}
