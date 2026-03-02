<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BillingReminder extends Mailable
{
    use Queueable, SerializesModels;

    public $customerName;
    public $dueDate;
    public $paymentUrl;
    public $supportUrl;

    /**
     * Create a new message instance.
     *
     * @param string $customerName
     * @param string $dueDate (e.g., "2026-03-02")
     * @param string $paymentUrl
     * @param string $supportUrl
     */
    public function __construct($customerName, $dueDate, $paymentUrl, $supportUrl = '#')
    {
        $this->customerName = $customerName;
        $this->dueDate = $dueDate;
        $this->paymentUrl = $paymentUrl;
        $this->supportUrl = $supportUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pengingat Perpanjangan Layanan',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.billing_reminder',
            with: [
                'customerName' => $this->customerName,
                'dueDate' => $this->dueDate,
                'paymentUrl' => $this->paymentUrl,
                'supportUrl' => $this->supportUrl,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
