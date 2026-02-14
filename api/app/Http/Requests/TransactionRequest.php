<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransactionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'account_id' => ['required', 'exists:wallets,id'], // Changed from finance_accounts to wallets
            'type' => ['required', 'in:IN,OUT,EXPENSE'],
            'amount' => ['required', 'numeric', 'min:0'],
            'category' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'items' => ['nullable', 'array'],
            'items.*.name' => ['required_with:items', 'string'],
            'items.*.amount' => ['required_with:items', 'numeric'],
            'date' => ['required', 'date'],
            'proof_url' => ['nullable', 'string'], // or url rule if strict
        ];
    }
}
